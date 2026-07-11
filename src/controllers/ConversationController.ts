import type { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/ConversationService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';

export class ConversationController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conv = await conversationService.create(req.userId!, req.body.title, req.body.documentIds);
      return sendSuccess(res, conv, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversations = await conversationService.list(req.userId!);
      return sendSuccess(res, { conversations });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const conv = await conversationService.getById(id, req.userId!);
      const messages = await conversationService.getMessages(id, req.userId!);
      return sendSuccess(res, { conversation: conv, messages });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const conv = await conversationService.updateTitle(id, req.userId!, req.body.title);
      return sendSuccess(res, conv);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await conversationService.delete(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  };
}

export const conversationController = new ConversationController();
