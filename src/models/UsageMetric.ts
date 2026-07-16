import mongoose, { Schema } from 'mongoose';

const usageMetricSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    operation: { type: String, enum: ['chat', 'chat_stream', 'presentation', 'quiz'], required: true },
    model: { type: String, required: true },
    latencyMs: { type: Number, required: true },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    totalTokens: { type: Number },
    success: { type: Boolean, required: true },
  },
  { timestamps: true }
);

usageMetricSchema.index({ operation: 1, createdAt: -1 });
usageMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const UsageMetric = mongoose.model('AiUsageMetric', usageMetricSchema);
