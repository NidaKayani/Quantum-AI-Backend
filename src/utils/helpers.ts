import type { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code?: string,
  details?: unknown
) {
  const body: ApiResponse = { success: false, error: message, code, details };
  return res.status(statusCode).json(body);
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
