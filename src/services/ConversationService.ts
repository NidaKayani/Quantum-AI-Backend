import { Types } from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { NotFoundError } from '../utils/errors.js';
import type { AiMessage } from '../providers/ai/types.js';

const MAX_HISTORY_MESSAGES = 50;

export class ConversationService {
  async create(userId: string, title?: string, documentIds?: string[]) {
    return Conversation.create({
      userId,
      title: title ?? 'New conversation',
      documentIds: documentIds?.map((id) => new Types.ObjectId(id)) ?? [],
    });
  }

  async list(userId: string, limit = 50) {
    return Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(limit);
  }

  async getById(id: string, userId: string) {
    const conv = await Conversation.findOne({ _id: id, userId });
    if (!conv) throw new NotFoundError('Conversation not found');
    return conv;
  }

  async updateTitle(id: string, userId: string, title: string) {
    const conv = await this.getById(id, userId);
    conv.title = title;
    await conv.save();
    return conv;
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
    extras?: { aiModel?: string; tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }
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
