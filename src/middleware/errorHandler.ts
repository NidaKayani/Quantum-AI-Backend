import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/helpers.js';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, `Route not found: ${req.method} ${req.path}`, 'NOT_FOUND');
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', err.flatten());
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, details: err.details, stack: err.stack });
    }
    return sendError(res, err.statusCode, err.message, err.code, err.details);
  }

  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 400, 'File too large', 'FILE_TOO_LARGE');
  }

  logger.error('Unhandled error', { err });
  return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
}
