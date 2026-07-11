import { documentStorageService } from './DocumentStorageService.js';
import { documentParserService } from './DocumentParserService.js';
import { getAiProvider } from '../providers/ai/index.js';
import type { AiMessage } from '../providers/ai/types.js';
import { truncateText } from '../utils/fileTypes.js';

const DOCUMENT_CONTEXT_LIMIT = 120_000;

export class FileConversionService {
  async pdfToTxt(documentId: string, userId: string): Promise<{ content: string; filename: string }> {
    const text = await documentStorageService.getExtractedText(documentId, userId);
    const doc = await documentStorageService.getById(documentId, userId);
    const content = documentParserService.toPlainTextFileContent(text, doc.originalName);
    return {
      content,
      filename: `${pathBasename(doc.originalName)}.txt`,
    };
  }

  async pdfToMarkdown(documentId: string, userId: string): Promise<{ content: string; filename: string }> {
    const text = await documentStorageService.getExtractedText(documentId, userId);
    const doc = await documentStorageService.getById(documentId, userId);
    const content = documentParserService.toMarkdown(text, doc.originalName);
    return {
      content,
      filename: `${pathBasename(doc.originalName)}.md`,
    };
  }
}

export class DocumentAnalysisService {
  async askAboutDocument(
    documentId: string,
    userId: string,
    question: string,
    conversationHistory: AiMessage[] = []
  ): Promise<{ answer: string; model: string }> {
    const doc = await documentStorageService.getById(documentId, userId);
    const text = await documentStorageService.getExtractedText(documentId, userId);
    const context = truncateText(text, DOCUMENT_CONTEXT_LIMIT);

    const systemPrompt = `You are Quantum AI, an expert educational assistant. Answer questions based ONLY on the provided document content. If the answer is not in the document, say so clearly. Be accurate, student-friendly, and cite relevant sections when possible.

Document: "${doc.originalName}"
---
${context}
---`;

    const messages: AiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.filter((m) => m.role !== 'system'),
      { role: 'user', content: question },
    ];

    const provider = getAiProvider();
    const response = await provider.chat({ messages });
    return { answer: response.content, model: response.model };
  }

  async summarizeDocument(documentId: string, userId: string): Promise<{ summary: string; model: string }> {
    const result = await this.askAboutDocument(
      documentId,
      userId,
      'Provide a comprehensive, student-friendly summary of this document including key concepts, main topics, and important takeaways.'
    );
    return { summary: result.answer, model: result.model };
  }
}

function pathBasename(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

export const fileConversionService = new FileConversionService();
export const documentAnalysisService = new DocumentAnalysisService();
