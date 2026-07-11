import type { Request, Response, NextFunction } from 'express';
import { aiChatService } from '../services/AiChatService.js';
import { sendSuccess } from '../utils/helpers.js';
export class AiController {
  chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { message, conversationId, documentIds, model, temperature, stream } = req.body;

      if (stream) {
        await aiChatService.chatStream(userId, message, res, {
          conversationId,
          documentIds,
          model,
          temperature,
        });
        return;
      }

      const result = await aiChatService.chat(userId, message, {
        conversationId,
        documentIds,
        model,
        temperature,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  listModels = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const models = await aiChatService.listModels();
      return sendSuccess(res, { models, provider: 'groq' });
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AiController();
