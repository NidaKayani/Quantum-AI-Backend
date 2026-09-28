import { Types } from 'mongoose';
import { SavedStudy, type SavedStudyKind } from '../models/SavedStudy.js';
import { NotFoundError } from '../utils/errors.js';

export type SavedStudyInput = {
  kind: SavedStudyKind;
  title: string;
  documentId?: string;
  documentName: string;
  payload: Record<string, unknown>;
};

export class SavedStudyService {
  async create(userId: string, input: SavedStudyInput) {
    return SavedStudy.create({
      userId,
      kind: input.kind,
      title: input.title,
      documentName: input.documentName,
      documentId: input.documentId && Types.ObjectId.isValid(input.documentId)
        ? new Types.ObjectId(input.documentId)
        : undefined,
      payload: input.payload,
    });
  }

  async list(userId: string) {
    return SavedStudy.find({ userId }).sort({ updatedAt: -1 }).limit(200);
  }

  async update(id: string, userId: string, patch: { title?: string; payload?: Record<string, unknown> }) {
    const item = await SavedStudy.findOne({ _id: id, userId });
    if (!item) throw new NotFoundError('Saved item not found');
    if (patch.title) item.title = patch.title;
    if (patch.payload) item.payload = patch.payload;
    await item.save();
    return item;
  }

  async delete(id: string, userId: string) {
    const item = await SavedStudy.findOne({ _id: id, userId });
    if (!item) throw new NotFoundError('Saved item not found');
    await item.deleteOne();
  }
}

export const savedStudyService = new SavedStudyService();
