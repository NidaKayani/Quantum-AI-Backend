import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { AiDocument } from '../models/Document.js';
import { documentParserService } from './DocumentParserService.js';
import { logger } from '../config/logger.js';
import { NotFoundError } from '../utils/errors.js';
import { getExtension, sanitizeFilename } from '../utils/fileTypes.js';
import { createStorageAdapter } from '../storage/index.js';

export class DocumentStorageService {
  private readonly storage = createStorageAdapter();

  async ensureUploadDir(): Promise<void> {
    await this.storage.ensureReady();
  }

  async saveUploadedFile(
    userId: string,
    file: Express.Multer.File,
    source: 'standalone' | 'quantum-chat' = 'standalone'
  ) {
    await this.ensureUploadDir();
    const ext = getExtension(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const stored = await this.storage.put(file.buffer, storedName, file.mimetype, userId);

    try {
      const parsed = await documentParserService.parseBuffer(
        file.buffer,
        file.originalname,
        file.mimetype
      );
      const extractedText = parsed.text.slice(0, config.MAX_EXTRACTED_TEXT_CHARS);
      const created = await AiDocument.create({
        userId,
        originalName: sanitizeFilename(file.originalname),
        storedName,
        mimeType: file.mimetype,
        size: file.size,
        extension: ext,
        storagePath: stored.key,
        storageProvider: stored.provider,
        storageKey: stored.key,
        extractedText,
        wordCount: parsed.wordCount,
        pageCount: parsed.pageCount,
        metadata: {
          format: parsed.format,
          source,
          extractedTextTruncated: parsed.text.length > extractedText.length,
        },
      });
      await this.indexForRag(userId, String(created._id), created.originalName, extractedText);
      return created;
    } catch (error) {
      await this.storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
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
      const buffer = await this.storage.read(doc.storageKey || doc.storagePath);
      const parsed = await documentParserService.parseBuffer(buffer, doc.originalName, doc.mimeType);
      doc.extractedText = parsed.text.slice(0, config.MAX_EXTRACTED_TEXT_CHARS);
      doc.wordCount = parsed.wordCount;
      doc.pageCount = parsed.pageCount;
      await doc.save();
    }
    return doc.extractedText ?? '';
  }

  async readFileBuffer(id: string, userId: string): Promise<Buffer> {
    const doc = await this.getById(id, userId);
    return this.storage.read(doc.storageKey || doc.storagePath);
  }

  async delete(id: string, userId: string): Promise<void> {
    const doc = await this.getById(id, userId);
    await this.storage.delete(doc.storageKey || doc.storagePath);
    await this.removeRagIndex(userId, id);
    await doc.deleteOne();
  }

  async saveGeneratedArtifact(
    userId: string,
    filename: string,
    mimeType: string,
    buffer: Buffer,
    metadata: Record<string, unknown> = {}
  ) {
    const ext = getExtension(filename);
    const storedName = `${uuidv4()}${ext}`;
    const stored = await this.storage.put(buffer, storedName, mimeType, userId);
    try {
      return await AiDocument.create({
        userId,
        originalName: sanitizeFilename(filename),
        storedName,
        mimeType,
        size: buffer.length,
        extension: ext,
        storagePath: stored.key,
        storageProvider: stored.provider,
        storageKey: stored.key,
        metadata: { ...metadata, generated: true },
      });
    } catch (error) {
      await this.storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
  }

  private async indexForRag(
    userId: string,
    documentId: string,
    filename: string,
    text: string
  ) {
    try {
      const { ragService } = await import('./RagService.js');
      const count = await ragService.indexFromText(userId, documentId, filename, text);
      logger.info(`Indexed ${count} RAG passages for ${filename}`);
    } catch (err) {
      logger.warn(`RAG index failed for ${filename}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async removeRagIndex(userId: string, documentId: string) {
    try {
      const { ragService } = await import('./RagService.js');
      await ragService.removeDocument(userId, documentId);
    } catch (err) {
      logger.warn(`RAG cleanup failed for ${documentId}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

export const documentStorageService = new DocumentStorageService();
