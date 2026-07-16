import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/index.js';

const app = createApp();
let connectionPromise: Promise<void> | undefined;

async function ensureDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  connectionPromise ??= connectDatabase().catch((error) => {
    connectionPromise = undefined;
    throw error;
  });
  await connectionPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureDatabase();
  return app(req, res);
}
