import mongoose from 'mongoose';
// Use compiled output so Vercel does not re-typecheck src/ (helmet CJS interop, etc.).
import app from '../dist/app.js';
import { connectDatabase } from '../dist/config/index.js';

let connectionPromise;

async function ensureDatabase() {
  if (mongoose.connection.readyState === 1) return;
  connectionPromise ??= connectDatabase().catch((error) => {
    connectionPromise = undefined;
    throw error;
  });
  await connectionPromise;
}

export default async function handler(req, res) {
  await ensureDatabase();
  return app(req, res);
}
