import { Router } from 'express';
import { authController } from '../controllers/AuthController.js';
import { authenticate, authRateLimiter } from '../middleware/index.js';
import { validateBody } from '../validators/index.js';
import { authLoginSchema, authRegisterSchema } from '../validators/schemas.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateBody(authRegisterSchema),
  authController.register
);
router.post('/login', authRateLimiter, validateBody(authLoginSchema), authController.login);
router.get('/me', authenticate, authController.me);

export default router;
