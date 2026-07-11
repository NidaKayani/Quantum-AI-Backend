import type { Request, Response, NextFunction } from 'express';
import { powerPointService } from '../services/PowerPointService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';

export class PresentationController {
  generatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await powerPointService.generatePlanFromDocument(
        getRouteParam(req, 'id'),
        req.userId!,
        req.body
      );
      return sendSuccess(res, { plan });
    } catch (err) {
      next(err);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const { buffer, plan, filename } = await powerPointService.generateFromDocument(
        id,
        req.userId!,
        req.body
      );

      if (req.query.download === 'true') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      return sendSuccess(res, {
        filename,
        plan,
        size: buffer.length,
        downloadHint: `POST /presentations/${id}/download`,
      });
    } catch (err) {
      next(err);
    }
  };

  download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { buffer, filename } = await powerPointService.generateFromDocument(
        getRouteParam(req, 'id'),
        req.userId!,
        req.body
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}

export const presentationController = new PresentationController();
