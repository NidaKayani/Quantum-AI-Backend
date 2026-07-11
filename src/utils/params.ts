import type { Request } from 'express';

/** Express 5 params may be string | string[] — normalize to string. */
export function getRouteParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
