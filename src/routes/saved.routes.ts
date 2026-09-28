import { Router } from 'express';
import { savedStudyController } from '../controllers/SavedStudyController.js';
import { authenticate } from '../middleware/index.js';
import { validateBody, validateParams } from '../validators/index.js';
import { createSavedStudySchema, objectIdParamSchema, updateSavedStudySchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', savedStudyController.list);
router.post('/', validateBody(createSavedStudySchema), savedStudyController.create);
router.patch(
  '/:id',
  validateParams(objectIdParamSchema),
  validateBody(updateSavedStudySchema),
  savedStudyController.update
);
router.delete('/:id', validateParams(objectIdParamSchema), savedStudyController.remove);

export default router;
