import { Router } from 'express';
import { presentationController } from '../controllers/PresentationController.js';
import { authenticate, aiRateLimiter } from '../middleware/index.js';
import { validateBody, validateParams } from '../validators/index.js';
import { objectIdParamSchema, presentationSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);
router.use(aiRateLimiter);

router.post(
  '/:id/plan',
  validateParams(objectIdParamSchema),
  validateBody(presentationSchema),
  presentationController.generatePlan
);
router.post(
  '/:id/generate',
  validateParams(objectIdParamSchema),
  validateBody(presentationSchema),
  presentationController.generate
);
router.post(
  '/:id/download',
  validateParams(objectIdParamSchema),
  validateBody(presentationSchema),
  presentationController.download
);

export default router;
