import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { AiDocument } from '../models/Document.js';
import { documentParserService } from './DocumentParserService.js';
import { NotFoundError } from '../utils/errors.js';
import { getExtension, sanitizeFilename } from '../utils/fileTypes.js';

export class DocumentStorageService {
  async ensureUploadDir(): Promise<void> {
    await fs.mkdir(config.UPLOAD_DIR, { recursive: true });
  }

  async saveUploadedFile(
    userId: string,
    file: Express.Multer.File
  ) {
    await this.ensureUploadDir();
    const ext = getExtension(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const storagePath = path.join(config.UPLOAD_DIR, storedName);
    await fs.writeFile(storagePath, file.buffer);

    const parsed = await documentParserService.parseFile(
      storagePath,
      file.originalname,
      file.mimetype
    );

    const doc = await AiDocument.create({
      userId,
      originalName: sanitizeFilename(file.originalname),
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      extension: ext,
      storagePath,
      extractedText: parsed.text,
      wordCount: parsed.wordCount,
      pageCount: parsed.pageCount,
      metadata: { format: parsed.format },
    });

    return doc;
  }

  async getById(id: string, userId: string) {
    const doc = await AiDocument.findOne({ _id: id, userId });
    if (!doc) throw new NotFoundError('Document not found');
    return doc;
  }

  async listForUser(userId: string) {
    return AiDocument.find({ userId }).sort({ createdAt: -1 });
  }

  async getExtractedText(id: string, userId: string): Promise<string> {
    const doc = await this.getById(id, userId);
    if (!doc.extractedText) {
      const parsed = await documentParserService.parseFile(
        doc.storagePath,
        doc.originalName,
        doc.mimeType
      );
      doc.extractedText = parsed.text;
      doc.wordCount = parsed.wordCount;
      doc.pageCount = parsed.pageCount;
      await doc.save();
    }
    return doc.extractedText ?? '';
  }

  async readFileBuffer(id: string, userId: string): Promise<Buffer> {
    const doc = await this.getById(id, userId);
    return fs.readFile(doc.storagePath);
  }

    async delete(id: string, userId: string): Promise<void> {
    const doc = await this.getById(id, userId);
    
    // Delete from filesystem
    try {
      await fs.unlink(doc.storagePath);
    } catch {
      // File may already be deleted, continue anyway
    }
    
    // Delete from database
    await AiDocument.deleteOne({ _id: id, userId });
  }

}

export const documentStorageService = new DocumentStorageService();
