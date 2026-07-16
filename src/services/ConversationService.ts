import { Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { NotFoundError } from '../utils/errors.js';
import type { AiMessage } from '../providers/ai/types.js';

const MAX_HISTORY_MESSAGES = 100;

export type ListConversationsOptions = {
  limit?: number;
  skip?: number;
  q?: string;
  archived?: boolean | 'all';
  cursor?: string;
};

export class ConversationService {
  async create(
    userId: string,
    title?: string,
    documentIds?: string[],
    metadata?: Record<string, unknown>
  ) {
    return Conversation.create({
      userId,
      title: title ?? 'New conversation',
      documentIds: documentIds?.map((id) => new Types.ObjectId(id)) ?? [],
      pinned: false,
      archived: false,
      metadata: metadata ?? {},
    });
  }

  async list(userId: string, options: ListConversationsOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
    const skip = Math.max(options.skip ?? 0, 0);
    const filter: Record<string, unknown> = { userId };

    if (options.archived === 'all') {
      // no archived filter
    } else if (options.archived === true) {
      filter.archived = true;
    } else {
      filter.archived = { $ne: true };
    }

    if (options.q?.trim()) {
      const q = options.q.trim();
      filter.$or = [
        { title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }

    if (options.cursor) {
      try {
        const parsed = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8')) as {
          pinned: boolean;
          updatedAt: string;
          id: string;
        };
        const cursorDate = new Date(parsed.updatedAt);
        filter.$and = [
          {
            $or: [
              { pinned: { $lt: parsed.pinned } },
              { pinned: parsed.pinned, updatedAt: { $lt: cursorDate } },
              {
                pinned: parsed.pinned,
                updatedAt: cursorDate,
                _id: { $lt: new Types.ObjectId(parsed.id) },
              },
            ],
          },
        ];
      } catch {
        // Invalid cursors safely return the first page.
      }
    }

    const [rows, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ pinned: -1, updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit + 1),
      Conversation.countDocuments(filter),
    ]);

    const hasMore = rows.length > limit;
    const conversations = hasMore ? rows.slice(0, limit) : rows;
    const last = conversations.at(-1);
    const nextCursor =
      hasMore && last
        ? Buffer.from(
            JSON.stringify({
              pinned: Boolean(last.pinned),
              updatedAt: last.updatedAt.toISOString(),
              id: String(last._id),
            })
          ).toString('base64url')
        : null;
    return { conversations, total, limit, skip, nextCursor };
  }

  async getById(id: string, userId: string) {
    const conv = await Conversation.findOne({ _id: id, userId });
    if (!conv) throw new NotFoundError('Conversation not found');
    return conv;
  }

  async update(
    id: string,
    userId: string,
    patch: { title?: string; pinned?: boolean; archived?: boolean }
  ) {
    const conv = await this.getById(id, userId);
    if (patch.title != null) conv.title = patch.title.trim();
    if (typeof patch.pinned === 'boolean') conv.pinned = patch.pinned;
    if (typeof patch.archived === 'boolean') {
      conv.archived = patch.archived;
      if (patch.archived) conv.pinned = false;
    }
    await conv.save();
    return conv;
  }

  async updateTitle(id: string, userId: string, title: string) {
    return this.update(id, userId, { title });
  }

  async delete(id: string, userId: string) {
    const conv = await this.getById(id, userId);
    await Message.deleteMany({ conversationId: conv._id });
    await conv.deleteOne();
  }

  async addDocument(conversationId: string, userId: string, documentId: string) {
    const conv = await this.getById(conversationId, userId);
    const oid = new Types.ObjectId(documentId);
    if (!conv.documentIds.some((d) => d.equals(oid))) {
      conv.documentIds.push(oid);
      await conv.save();
    }
    return conv;
  }

  async getMessages(conversationId: string, userId: string) {
    await this.getById(conversationId, userId);
    return Message.find({ conversationId }).sort({ createdAt: 1 }).limit(MAX_HISTORY_MESSAGES);
  }

  async getHistoryForAi(conversationId: string, userId: string): Promise<AiMessage[]> {
    const messages = await this.getMessages(conversationId, userId);
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
  }

  async appendMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    extras?: {
      aiModel?: string;
      tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    }
  ) {
    await this.getById(conversationId, userId);
    const msg = await Message.create({
      conversationId,
      role,
      content,
      aiModel: extras?.aiModel,
      tokenUsage: extras?.tokenUsage,
    });
    await Conversation.updateOne({ _id: conversationId }, { $set: { updatedAt: new Date() } });
    return msg;
  }

  /** Delete the last N messages (for regenerate / edit prompt). */
  async deleteLastMessages(conversationId: string, userId: string, count = 1) {
    await this.getById(conversationId, userId);
    const n = Math.min(Math.max(count, 1), 20);
    const last = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(n)
      .select('_id');
    const ids = last.map((m) => m._id);
    if (ids.length) {
      await Message.deleteMany({ _id: { $in: ids } });
      await Conversation.updateOne({ _id: conversationId }, { $set: { updatedAt: new Date() } });
    }
    return { deleted: ids.length };
  }

  /** Delete a message and everything after it (edit & resend from that point). */
  async truncateFromMessage(conversationId: string, userId: string, messageId: string) {
    await this.getById(conversationId, userId);
    const target = await Message.findOne({ _id: messageId, conversationId });
    if (!target) throw new NotFoundError('Message not found');
    const result = await Message.deleteMany({
      conversationId,
      createdAt: { $gte: target.createdAt },
    });
    await Conversation.updateOne({ _id: conversationId }, { $set: { updatedAt: new Date() } });
    return { deleted: result.deletedCount ?? 0 };
  }

  async autoTitleFromMessage(conversationId: string, userId: string, firstUserMessage: string) {
    const conv = await this.getById(conversationId, userId);
    if (conv.title !== 'New conversation') return conv;
    const title = firstUserMessage.slice(0, 60).trim() || 'New conversation';
    conv.title = title.length < firstUserMessage.length ? `${title}…` : title;
    await conv.save();
    return conv;
  }
}

export const conversationService = new ConversationService();
