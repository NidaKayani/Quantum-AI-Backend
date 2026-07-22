import multerImport from 'multer';
import type { FileFilterCallback } from 'multer';
import { config } from '../config/index.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, getExtension } from '../utils/fileTypes.js';
import { ValidationError } from '../utils/errors.js';

/** multer CJS typings are not callable under NodeNext + TS 5.9. */
const multer = multerImport as unknown as typeof multerImport & {
  (options?: multerImport.Options): multerImport.Multer;
  memoryStorage: () => multerImport.StorageEngine;
};

const storage = multer.memoryStorage();

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
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
