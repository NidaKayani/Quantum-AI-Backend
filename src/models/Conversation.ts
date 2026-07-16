import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IConversationDocument extends Document {
  userId: string;
  title: string;
  documentIds: Types.ObjectId[];
  pinned: boolean;
  archived: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversationDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: 'New conversation' },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'AiDocument' }],
    pinned: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });
conversationSchema.index({ title: 'text' });

export const Conversation = mongoose.model<IConversationDocument>(
  'AiConversation',
  conversationSchema
);
