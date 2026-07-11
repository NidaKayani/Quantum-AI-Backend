import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Resolves the authenticated user id from JWT or dev headers.
 * Compatible with Quantum Chat JWT tokens (sub / id claims).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload & { sub?: string; id?: string; userId?: string };

      if (payload.iss && payload.iss !== config.JWT_ISSUER) {
        throw new UnauthorizedError('Invalid token issuer');
      }

      req.auth = payload;
      req.userId = payload.userId ?? payload.id ?? payload.sub;
      if (!req.userId) {
        throw new UnauthorizedError('Token missing user identifier');
      }
      return next();
    } catch {
      if (config.AUTH_REQUIRED) {
        return next(new UnauthorizedError('Invalid or expired token'));
      }
    }
  }

  if (!config.AUTH_REQUIRED) {
    const devUser = req.headers['x-user-id'];
    req.userId = typeof devUser === 'string' && devUser.trim() ? devUser.trim() : 'dev-user';
    return next();
  }

  return next(new UnauthorizedError('Authentication required'));
}

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    return next(new UnauthorizedError('User context required'));
  }
  next();
}
