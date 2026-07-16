import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { getExtension } from '../utils/fileTypes.js';
import { ValidationError } from '../utils/errors.js';
import { config } from '../config/index.js';
import { getAiProvider } from '../providers/ai/index.js';

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
  format: string;
}

export class DocumentParserService {
  async parseFile(filePath: string, originalName: string, mimeType: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    return this.parseBuffer(buffer, originalName, mimeType);
  }

  async parseBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<ParsedDocument> {
    const ext = getExtension(originalName);
    switch (ext) {
      case '.pdf':
        return this.parsePdf(buffer);
      case '.docx':
      case '.doc':
        return this.parseDocx(buffer);
      case '.txt':
      case '.md':
      case '.markdown':
        return this.parsePlainText(buffer, ext);
      case '.csv':
        return this.parseCsv(buffer);
      case '.xlsx':
      case '.xls':
        return this.parseExcel(buffer);
      case '.json':
        return this.parseJson(buffer);
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.webp':
        return this.parseImage(buffer, originalName, mimeType);
      default:
        if (mimeType.startsWith('text/')) {
          return this.parsePlainText(buffer, ext || 'text');
        }
        throw new ValidationError(`Unsupported file type: ${ext || mimeType}`);
    }
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedDocument> {
    const data = await pdfParse(buffer);
    const text = data.text?.trim() ?? '';
    return {
      text,
      pageCount: data.numpages,
      wordCount: this.countWords(text),
      format: 'pdf',
    };
  }

  private async parseDocx(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() ?? '';
    return { text, wordCount: this.countWords(text), format: 'docx' };
  }

  private parsePlainText(buffer: Buffer, format: string): ParsedDocument {
    const text = buffer.toString('utf-8').trim();
    return { text, wordCount: this.countWords(text), format };
  }

  private parseCsv(buffer: Buffer): ParsedDocument {
    const text = buffer.toString('utf-8').trim();
    return { text, wordCount: this.countWords(text), format: 'csv' };
  }

  private parseExcel(buffer: Buffer): ParsedDocument {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`## Sheet: ${sheetName}\n${csv}`);
    }
    const text = parts.join('\n\n');
    return { text, wordCount: this.countWords(text), format: 'xlsx' };
  }

  private parseJson(buffer: Buffer): ParsedDocument {
    const raw = buffer.toString('utf-8');
    let text: string;
    try {
      text = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      text = raw;
    }
    return { text, wordCount: this.countWords(text), format: 'json' };
  }

  private async parseImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<ParsedDocument> {
    if (buffer.length > 10 * 1024 * 1024) {
      throw new ValidationError('Images sent to vision must be 10 MB or smaller');
    }
    const response = await getAiProvider().chat({
      model: config.GROQ_VISION_MODEL,
      temperature: 0.2,
      maxTokens: 2_000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Analyze ${originalName}. Transcribe visible text accurately, describe diagrams, ` +
                'and explain the educational meaning. Do not invent details that are not visible.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` },
            },
          ],
        },
      ],
    });
    const text = response.content.trim();
    return { text, wordCount: this.countWords(text), format: 'image-vision' };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  /** Convert extracted plain text to simple Markdown structure */
  toMarkdown(text: string, title?: string): string {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const heading = title ? `# ${title}\n\n` : '';
    const body = lines.map((line) => {
      if (line.length < 80 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
        return `## ${line}`;
      }
      return line;
    }).join('\n\n');
    return `${heading}${body}\n`;
  }

  toPlainTextFileContent(text: string, title?: string): string {
    const header = title ? `${title}\n${'='.repeat(title.length)}\n\n` : '';
    return `${header}${text}`;
  }
}

export const documentParserService = new DocumentParserService();
