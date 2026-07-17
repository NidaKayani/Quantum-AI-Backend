import { Router } from 'express';
import { documentController } from '../controllers/DocumentController.js';
import { authenticate, upload } from '../middleware/index.js';
import { validateBody, validateParams } from '../validators/index.js';
import { documentQuestionSchema, objectIdParamSchema } from '../validators/schemas.js';
import { config } from '../config/index.js';
import { presentationController } from '../controllers/PresentationController.js';
import { presentationSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticate);

router.post(
  '/upload',
  upload.array('files', config.MAX_FILES_PER_REQUEST),
  documentController.upload
);
router.get('/', documentController.list);
router.get('/:id', validateParams(objectIdParamSchema), documentController.get);
router.get('/:id/text', validateParams(objectIdParamSchema), documentController.extractText);
router.post('/:id/ask', validateParams(objectIdParamSchema), validateBody(documentQuestionSchema), documentController.ask);
router.post('/:id/summarize', validateParams(objectIdParamSchema), documentController.summarize);
// Add this line after the summarize route
router.post('/:id/presentation', validateParams(objectIdParamSchema), validateBody(presentationSchema), presentationController.generate);
router.post('/:id/convert/txt', validateParams(objectIdParamSchema), documentController.toTxt);
router.post('/:id/convert/markdown', validateParams(objectIdParamSchema), documentController.toMarkdown);
router.get('/:id/download/txt', validateParams(objectIdParamSchema), documentController.downloadTxt);
router.get('/:id/download/markdown', validateParams(objectIdParamSchema), documentController.downloadMarkdown);
router.delete('/:id', validateParams(objectIdParamSchema), documentController.delete);

export default router;

