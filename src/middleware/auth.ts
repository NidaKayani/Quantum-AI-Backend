import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AI_JWT_ISSUER } from '../utils/authTokens.js';

const LEGACY_ISSUERS = new Set(['quantum-chat', 'quantumchat']);

function isAllowedIssuer(iss: string | undefined): boolean {
  if (!iss) return true; // legacy QuantumChat tokens often omit iss
  if (iss === AI_JWT_ISSUER) return true;
  if (iss === config.JWT_ISSUER) return true;
  if (LEGACY_ISSUERS.has(iss)) return true;
  return false;
}

/**
 * Resolves the authenticated user id from JWT (Quantum AI or legacy Quantum Chat)
 * or from X-User-Id when AUTH_REQUIRED=false.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload & {
        sub?: string;
        id?: string;
        userId?: string;
        email?: string;
      };

      if (!isAllowedIssuer(payload.iss)) {
        throw new UnauthorizedError('Invalid token issuer');
      }

      req.auth = payload;
      req.userId = payload.userId ?? payload.id ?? payload.sub;
      if (!req.userId) {
        throw new UnauthorizedError('Token missing user identifier');
      }
      return next();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return next(err);
      }
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
