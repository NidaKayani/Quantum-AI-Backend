import { Router } from 'express';
import { conversationController } from '../controllers/ConversationController.js';
import { authenticate } from '../middleware/index.js';
import { validateBody, validateParams } from '../validators/index.js';
import {
  createConversationSchema,
  objectIdParamSchema,
  updateConversationSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createConversationSchema), conversationController.create);
router.get('/', conversationController.list);
router.get('/:id', validateParams(objectIdParamSchema), conversationController.get);
router.patch('/:id', validateParams(objectIdParamSchema), validateBody(updateConversationSchema), conversationController.update);
router.delete('/:id', validateParams(objectIdParamSchema), conversationController.remove);

export default router;
