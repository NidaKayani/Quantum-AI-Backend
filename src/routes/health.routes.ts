import { Router } from 'express';
import { healthController } from '../controllers/HealthController.js';

const router = Router();

router.get('/health', healthController.health);
router.get('/ready', healthController.ready);

export default router;
