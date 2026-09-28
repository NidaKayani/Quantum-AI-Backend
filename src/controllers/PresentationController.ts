import type { Request, Response, NextFunction } from 'express';
import { powerPointService, type PresentationPlan } from '../services/PowerPointService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';
import { documentStorageService } from '../services/DocumentStorageService.js';
import { UsageMetric } from '../models/UsageMetric.js';
import { config } from '../config/index.js';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const SLIDE_TYPES = new Set([
  'title',
  'objectives',
  'content',
  'example',
  'diagram',
  'summary',
  'slo_questions',
]);

function sanitizeFilename(value: string, fallback: string) {
  const cleaned = value.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const base = cleaned || fallback;
  return base.toLowerCase().endsWith('.pptx') ? base : `${base}.pptx`;
}

function normalizePlan(input: {
  presentationTitle: string;
  subtitle?: string;
  slides: Array<{ type: string; title: string; bullets?: string[]; notes?: string }>;
}): PresentationPlan {
  return {
    presentationTitle: input.presentationTitle,
    subtitle: input.subtitle,
    slides: input.slides.map((slide) => ({
      type: (SLIDE_TYPES.has(slide.type) ? slide.type : 'content') as PresentationPlan['slides'][number]['type'],
      title: slide.title,
      bullets: slide.bullets,
      notes: slide.notes,
    })),
  };
}

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
      const startedAt = Date.now();
      const id = getRouteParam(req, 'id');
      const { buffer, plan, filename } = await powerPointService.generateFromDocument(
        id,
        req.userId!,
        req.body
      );

      if (req.query.download === 'true') {
        res.setHeader('Content-Type', PPTX_MIME);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
      }

      const artifact = await documentStorageService.saveGeneratedArtifact(
        req.userId!,
        filename,
        PPTX_MIME,
        buffer,
        { sourceDocumentId: id, artifactType: 'presentation' }
      );
      await UsageMetric.create({
        userId: req.userId!,
        operation: 'presentation',
        model: config.GROQ_CHAT_MODEL,
        latencyMs: Date.now() - startedAt,
        success: true,
      });
      return sendSuccess(res, {
        filename,
        plan,
        size: buffer.length,
        artifactDocumentId: String(artifact._id),
        storageProvider: artifact.storageProvider,
        downloadHint: `POST /presentations/${id}/download`,
      });
    } catch (err) {
      next(err);
    }
  };

  /** Build a .pptx from an existing slide plan (no extra AI call). */
  build = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startedAt = Date.now();
      const plan = normalizePlan(req.body);
      const buffer = await powerPointService.buildPptxBuffer(plan);
      const filename = sanitizeFilename(
        typeof req.body.filename === 'string' ? req.body.filename : '',
        `${plan.presentationTitle.slice(0, 40)}-presentation`
      );

      const sourceDocumentId =
        typeof req.body.sourceDocumentId === 'string' && req.body.sourceDocumentId.trim()
          ? req.body.sourceDocumentId.trim()
          : undefined;

      if (sourceDocumentId) {
        try {
          await documentStorageService.saveGeneratedArtifact(
            req.userId!,
            filename,
            PPTX_MIME,
            buffer,
            { sourceDocumentId, artifactType: 'presentation' }
          );
        } catch {
          // Still return the file even if artifact storage fails (e.g. source deleted).
        }
      }

      await UsageMetric.create({
        userId: req.userId!,
        operation: 'presentation',
        model: config.GROQ_CHAT_MODEL,
        latencyMs: Date.now() - startedAt,
        success: true,
      });

      res.setHeader('Content-Type', PPTX_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startedAt = Date.now();
      const id = getRouteParam(req, 'id');
      const { buffer, filename } = await powerPointService.generateFromDocument(
        id,
        req.userId!,
        req.body
      );

      await documentStorageService.saveGeneratedArtifact(
        req.userId!,
        filename,
        PPTX_MIME,
        buffer,
        { sourceDocumentId: id, artifactType: 'presentation' }
      );
      await UsageMetric.create({
        userId: req.userId!,
        operation: 'presentation',
        model: config.GROQ_CHAT_MODEL,
        latencyMs: Date.now() - startedAt,
        success: true,
      });
      res.setHeader('Content-Type', PPTX_MIME);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}

export const presentationController = new PresentationController();
