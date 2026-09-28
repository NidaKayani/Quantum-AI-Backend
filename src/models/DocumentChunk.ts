import mongoose, { Schema, Types } from 'mongoose';

export interface IDocumentChunk {
  userId: string;
  documentId: Types.ObjectId;
  filename: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    userId: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'AiDocument', required: true, index: true },
    filename: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    tokenCount: { type: Number, required: true },
  },
  { timestamps: true }
);

documentChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 }, { unique: true });

export const DocumentChunk = mongoose.model<IDocumentChunk>('DocumentChunk', documentChunkSchema);
