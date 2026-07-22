import type { Request, Response } from 'express';
import mongoose from 'mongoose';
// Import compiled output so Vercel does not re-typecheck all of src/ (helmet/CJS interop, etc.)
import { createApp } from '../dist/app.js';
import { connectDatabase } from '../dist/config/index.js';

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
