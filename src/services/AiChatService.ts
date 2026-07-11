import type { Response } from 'express';
import { config } from '../config/index.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AiMessage } from '../providers/ai/types.js';
import { conversationService } from './ConversationService.js';
import { documentStorageService } from './DocumentStorageService.js';
import { truncateText } from '../utils/fileTypes.js';
import { NotFoundError } from '../utils/errors.js';

const SYSTEM_PROMPT = `You are Quantum AI, a helpful, accurate, and student-friendly educational assistant built for Quantum Chat. Provide clear explanations, structured answers, and practical examples when appropriate.`;

export class AiChatService {
  async chat(
    userId: string,
    message: string,
    options?: {
      conversationId?: string;
      documentIds?: string[];
      model?: string;
      temperature?: number;
    }
  ) {
    let conversationId = options?.conversationId;
    if (conversationId) {
      await conversationService.getById(conversationId, userId);
    } else {
      const conv = await conversationService.create(userId, undefined, options?.documentIds);
      conversationId = String(conv._id);
    }

    const history = await conversationService.getHistoryForAi(conversationId, userId);
    const contextBlock = await this.buildDocumentContext(userId, options?.documentIds);
    const messages = this.buildMessages(history, message, contextBlock);

    await conversationService.appendMessage(conversationId, userId, 'user', message);
    await conversationService.autoTitleFromMessage(conversationId, userId, message);

    const provider = getAiProvider();
    const response = await provider.chat({
      messages,
      model: options?.model,
      temperature: options?.temperature,
    });

    await conversationService.appendMessage(conversationId, userId, 'assistant', response.content, {
      aiModel: response.model,
      tokenUsage: response.usage,
    });

    return {
      conversationId,
      message: response.content,
      model: response.model,
      usage: response.usage,
    };
  }

  async chatStream(
    userId: string,
    message: string,
    res: Response,
    options?: {
      conversationId?: string;
      documentIds?: string[];
      model?: string;
      temperature?: number;
    }
  ) {
    let conversationId = options?.conversationId;
    if (conversationId) {
      await conversationService.getById(conversationId, userId);
    } else {
      const conv = await conversationService.create(userId, undefined, options?.documentIds);
      conversationId = String(conv._id);
    }

    const history = await conversationService.getHistoryForAi(conversationId, userId);
    const contextBlock = await this.buildDocumentContext(userId, options?.documentIds);
    const messages = this.buildMessages(history, message, contextBlock);

    await conversationService.appendMessage(conversationId, userId, 'user', message);
    await conversationService.autoTitleFromMessage(conversationId, userId, message);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('start', { conversationId });

    const provider = getAiProvider();
    let fullContent = '';
    const model = options?.model ?? config.GROQ_CHAT_MODEL;

    try {
      for await (const chunk of provider.chatStream({
        messages,
        model: options?.model,
        temperature: options?.temperature,
      })) {
        if (chunk.content) {
          fullContent += chunk.content;
          sendEvent('chunk', { content: chunk.content });
        }
        if (chunk.done) break;
      }

      const saved = await conversationService.appendMessage(
        conversationId,
        userId,
        'assistant',
        fullContent,
        { aiModel: model }
      );

      sendEvent('done', {
        conversationId,
        messageId: String(saved._id),
        content: fullContent,
        model,
      });
    } catch (err) {
      sendEvent('error', {
        message: err instanceof Error ? err.message : 'Stream failed',
      });
    } finally {
      res.end();
    }
  }

  async listModels() {
    const provider = getAiProvider();
    return provider.listModels();
  }

  private buildMessages(history: AiMessage[], userMessage: string, documentContext: string): AiMessage[] {
    const systemParts = [SYSTEM_PROMPT];
    if (documentContext) {
      systemParts.push(`\nRelevant uploaded documents:\n${documentContext}`);
    }

    return [
      { role: 'system', content: systemParts.join('\n') },
      ...history,
      { role: 'user', content: userMessage },
    ];
  }

  private async buildDocumentContext(userId: string, documentIds?: string[]): Promise<string> {
    if (!documentIds?.length) return '';

    const parts: string[] = [];
    for (const id of documentIds) {
      try {
        const doc = await documentStorageService.getById(id, userId);
        const text = await documentStorageService.getExtractedText(id, userId);
        parts.push(`### ${doc.originalName}\n${truncateText(text, 20_000)}`);
      } catch (err) {
        if (err instanceof NotFoundError) continue;
        throw err;
      }
    }
    return parts.join('\n\n');
  }
}

export const aiChatService = new AiChatService();
