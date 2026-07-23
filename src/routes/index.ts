import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import aiRoutes from './ai.routes.js';
import conversationRoutes from './conversation.routes.js';
import documentRoutes from './document.routes.js';
import presentationRoutes from './presentation.routes.js';
import usageRoutes from './usage.routes.js';
import searchRoutes from './search.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/conversations', conversationRoutes);
router.use('/documents', documentRoutes);
router.use('/presentations', presentationRoutes);
router.use('/usage', usageRoutes);
router.use('/search', searchRoutes);

export default router;
