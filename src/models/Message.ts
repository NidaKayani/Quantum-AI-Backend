import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageRole = 'system' | 'user' | 'assistant';

export interface IMessageDocument extends Document {
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  aiModel?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'AiConversation', required: true, index: true },
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    aiModel: { type: String },
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessageDocument>('AiMessage', messageSchema);
