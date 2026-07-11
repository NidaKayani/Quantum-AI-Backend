import multer from 'multer';
import { config } from '../config/index.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, getExtension } from '../utils/fileTypes.js';
import { ValidationError } from '../utils/errors.js';

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = getExtension(file.originalname);
  const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype);
  const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);

  if (!mimeOk && !extOk) {
    return cb(new ValidationError(`File type not allowed: ${file.originalname}`));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: config.MAX_FILES_PER_REQUEST,
  },
  fileFilter,
});
