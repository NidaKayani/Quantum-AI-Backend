import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { AiUser } from '../models/AiUser.js';
import { config } from '../config/index.js';
import { sendSuccess } from '../utils/helpers.js';
import { AppError, UnauthorizedError, ValidationError } from '../utils/errors.js';

import { AI_JWT_ISSUER } from '../utils/authTokens.js';

function signAiToken(user: { id: string; email: string }) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: AI_JWT_ISSUER,
    }
  );
}

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body.password || '');
      const displayName = String(req.body.displayName || email.split('@')[0] || 'User').trim();

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }
      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
      }

      const existing = await AiUser.findOne({ email });
      if (existing) {
        throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await AiUser.create({ email, passwordHash, displayName });
      const publicUser = user.toPublicJSON();
      const token = signAiToken({ id: publicUser.id, email: publicUser.email });

      return sendSuccess(res, { token, user: publicUser }, 201);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = String(req.body.email || '')
        .trim()
        .toLowerCase();
      const password = String(req.body.password || '');

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const user = await AiUser.findOne({ email }).select('+passwordHash');
      if (!user || !(await user.comparePassword(password))) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const publicUser = user.toPublicJSON();
      const token = signAiToken({ id: publicUser.id, email: publicUser.email });
      return sendSuccess(res, { token, user: publicUser });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) throw new UnauthorizedError('Authentication required');
      const user = await AiUser.findById(req.userId);
      if (!user) {
        return sendSuccess(res, {
          user: {
            id: req.userId,
            email: typeof req.auth?.email === 'string' ? req.auth.email : undefined,
            displayName: 'Quantum user',
            legacy: true,
          },
        });
      }
      return sendSuccess(res, { user: user.toPublicJSON() });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
