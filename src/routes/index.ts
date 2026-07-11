import { Router } from 'express';
import healthRoutes from './health.routes.js';
import aiRoutes from './ai.routes.js';
import conversationRoutes from './conversation.routes.js';
import documentRoutes from './document.routes.js';
import presentationRoutes from './presentation.routes.js';

const router = Router();

router.use(healthRoutes);
router.use('/ai', aiRoutes);
router.use('/conversations', conversationRoutes);
router.use('/documents', documentRoutes);
router.use('/presentations', presentationRoutes);

export default router;
