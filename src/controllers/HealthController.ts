import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/helpers.js';
import { config } from '../config/index.js';
import mongoose from 'mongoose';

export class HealthController {
  health = (_req: Request, res: Response) => {
    return sendSuccess(res, {
      status: 'ok',
      service: 'Quantum AI',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  };

  ready = async (_req: Request, res: Response) => {
    const dbReady = mongoose.connection.readyState === 1;
    const status = dbReady ? 'ready' : 'degraded';
    return res.status(dbReady ? 200 : 503).json({
      success: dbReady,
      data: {
        status,
        database: dbReady ? 'connected' : 'disconnected',
        provider: 'groq',
        authRequired: config.AUTH_REQUIRED,
      },
    });
  };
}

export const healthController = new HealthController();
