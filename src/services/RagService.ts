import { Types } from 'mongoose';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { documentStorageService } from './DocumentStorageService.js';
import { chunkText } from './rag/chunkText.js';
import { rankByBm25, tokenize } from './rag/bm25.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export interface RagSource {
  documentId: string;
  filename: string;
  part: number;
  snippet: string;
}

export interface RagContext {
  context: string;
  sources: RagSource[];
}

const DEFAULT_LIMIT = 6;
const MAX_CONTEXT_CHARS = 12_000;

type StoredChunk = {
  documentId: Types.ObjectId;
  filename: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
};

export class RagService {
  async indexFromText(
    userId: string,
    documentId: string,
    filename: string,
    text: string
  ): Promise<number> {
    if (!Types.ObjectId.isValid(documentId)) return 0;
    const oid = new Types.ObjectId(documentId);
    const chunks = chunkText(text);
    await DocumentChunk.deleteMany({ userId, documentId: oid });
    if (!chunks.length) return 0;

    await DocumentChunk.insertMany(
      chunks.map((chunk, chunkIndex) => ({
        userId,
        documentId: oid,
        filename,
        chunkIndex,
        text: chunk,
        tokenCount: tokenize(chunk).length,
      }))
    );
    return chunks.length;
  }

  async removeDocument(userId: string, documentId: string): Promise<void> {
    if (!Types.ObjectId.isValid(documentId)) return;
    await DocumentChunk.deleteMany({ userId, documentId: new Types.ObjectId(documentId) });
  }

  async retrieve(
    userId: string,
    documentIds: string[] | undefined,
    query: string,
    limit = DEFAULT_LIMIT
  ): Promise<RagContext> {
    const ids = [...new Set((documentIds ?? []).filter((id) => Types.ObjectId.isValid(id)))];
    if (!ids.length) return { context: '', sources: [] };

    await this.ensureIndexed(userId, ids);
    const chunks = await DocumentChunk.find({
      userId,
      documentId: { $in: ids.map((id) => new Types.ObjectId(id)) },
    })
      .sort({ chunkIndex: 1 })
      .lean<StoredChunk[]>();

    if (!chunks.length) return { context: '', sources: [] };

    const ranked = rankByBm25(query, chunks, (chunk) => chunk.text, limit);
    const sources: RagSource[] = ranked.map(({ item }) => ({
      documentId: String(item.documentId),
      filename: item.filename,
      part: item.chunkIndex + 1,
      snippet: snippet(item.text),
    }));

    const blocks = ranked.map(({ item }, index) => {
      const body = item.text.length > 1_500 ? `${item.text.slice(0, 1_500)}…` : item.text;
      return `[${index + 1}] File: ${item.filename} (part ${item.chunkIndex + 1})\n${body}`;
    });

    let context = blocks.join('\n\n');
    if (context.length > MAX_CONTEXT_CHARS) {
      context = `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n...[more passages omitted]`;
    }

    return { context, sources };
  }

  private async ensureIndexed(userId: string, documentIds: string[]): Promise<void> {
    const existing = await DocumentChunk.distinct('documentId', {
      userId,
      documentId: { $in: documentIds.map((id) => new Types.ObjectId(id)) },
    });
    const indexed = new Set(existing.map((id) => String(id)));

    for (const id of documentIds) {
      if (indexed.has(id)) continue;
      try {
        const doc = await documentStorageService.getById(id, userId);
        const text = doc.extractedText ?? (await documentStorageService.getExtractedText(id, userId));
        const count = await this.indexFromText(userId, id, doc.originalName, text);
        logger.info(`Indexed ${count} RAG passages for ${doc.originalName}`);
      } catch (err) {
        if (err instanceof NotFoundError) continue;
        logger.warn(`RAG index skipped for document ${id}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 180 ? `${flat.slice(0, 177)}…` : flat;
}

export const ragService = new RagService();
