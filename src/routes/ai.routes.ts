import { Router } from 'express';
import { aiController } from '../controllers/AiController.js';
import { authenticate, aiRateLimiter } from '../middleware/index.js';
import { validateBody } from '../validators/index.js';
import { chatBodySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);
router.use(aiRateLimiter);

router.post('/chat', validateBody(chatBodySchema), aiController.chat);
router.get('/models', aiController.listModels);

export default router;
