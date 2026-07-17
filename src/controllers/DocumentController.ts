import type { Request, Response, NextFunction } from 'express';
import { documentStorageService } from '../services/DocumentStorageService.js';
import {
  documentAnalysisService,
  fileConversionService,
} from '../services/DocumentAnalysisService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';
import { powerPointService } from '../services/PowerPointService.js';



export class DocumentController {
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) {
        return res.status(400).json({ success: false, error: 'No files uploaded', code: 'NO_FILES' });
      }

      const saved = [];
      for (const file of files) {
        const doc = await documentStorageService.saveUploadedFile(req.userId!, file);
        saved.push({
          id: doc._id,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          wordCount: doc.wordCount,
          pageCount: doc.pageCount,
          createdAt: doc.createdAt,
        });
      }

      return sendSuccess(res, { documents: saved }, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await documentStorageService.listForUser(req.userId!);
      return sendSuccess(res, { documents });
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const doc = await documentStorageService.getById(id, req.userId!);
      return sendSuccess(res, { document: doc });
    } catch (err) {
      next(err);
    }
  };

  extractText = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const doc = await documentStorageService.getById(id, req.userId!);
      const text = await documentStorageService.getExtractedText(id, req.userId!);
      return sendSuccess(res, {
        id: doc._id,
        originalName: doc.originalName,
        text,
        wordCount: doc.wordCount,
        pageCount: doc.pageCount,
      });
    } catch (err) {
      next(err);
    }
  };

  ask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const result = await documentAnalysisService.askAboutDocument(
        id,
        req.userId!,
        req.body.question
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  summarize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await documentAnalysisService.summarizeDocument(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  toTxt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fileConversionService.pdfToTxt(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  toMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fileConversionService.pdfToMarkdown(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  downloadTxt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fileConversionService.pdfToTxt(getRouteParam(req, 'id'), req.userId!);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.content);
    } catch (err) {
      next(err);
    }
  };

  downloadMarkdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fileConversionService.pdfToMarkdown(getRouteParam(req, 'id'), req.userId!);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.content);
    } catch (err) {
      next(err);
    }
  };

  presentation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, plan, filename } = await powerPointService.generateFromDocument(
        getRouteParam(req, 'id'),
        req.userId!,
        req.body
      );
      return sendSuccess(res, { text, plan, filename });
    } catch (err) {
      next(err);
    }
  }; 

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await documentStorageService.delete(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, { success: true });
    } catch (err) {
      next(err);
    }
  };

}

export const documentController = new DocumentController();
