import mongoose, { Schema, Types } from 'mongoose';

export type SavedStudyKind = 'summary' | 'quiz' | 'slides';

export interface ISavedStudy {
  userId: string;
  documentId?: Types.ObjectId;
  documentName: string;
  kind: SavedStudyKind;
  title: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const savedStudySchema = new Schema<ISavedStudy>(
  {
    userId: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'AiDocument' },
    documentName: { type: String, required: true },
    kind: { type: String, enum: ['summary', 'quiz', 'slides'], required: true },
    title: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

savedStudySchema.index({ userId: 1, updatedAt: -1 });

export const SavedStudy = mongoose.model<ISavedStudy>('SavedStudy', savedStudySchema);
