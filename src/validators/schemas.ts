import { z } from 'zod';

export const chatBodySchema = z.object({
  message: z.string().min(1).max(32_000),
  conversationId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional().default(false),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentIds: z.array(z.string()).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200),
});

export const documentQuestionSchema = z.object({
  question: z.string().min(1).max(8_000),
  conversationId: z.string().optional(),
});

export const presentationSchema = z.object({
  subject: z.string().max(200).optional(),
  gradeLevel: z.string().max(100).optional(),
  sloTopics: z.array(z.string().max(200)).max(20).optional(),
});

export const objectIdParamSchema = z.object({
  id: z.string().min(1),
});
