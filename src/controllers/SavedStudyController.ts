import type { Request, Response, NextFunction } from 'express';
import { savedStudyService } from '../services/SavedStudyService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';

export class SavedStudyController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await savedStudyService.create(req.userId!, req.body);
      return sendSuccess(res, item, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await savedStudyService.list(req.userId!);
      return sendSuccess(res, { items });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await savedStudyService.update(getRouteParam(req, 'id'), req.userId!, req.body);
      return sendSuccess(res, item);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await savedStudyService.delete(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, { success: true });
    } catch (err) {
      next(err);
    }
  };
}

export const savedStudyController = new SavedStudyController();
