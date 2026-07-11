import type { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      auth?: JwtPayload & { sub?: string; id?: string };
    }
  }
}

export {};
