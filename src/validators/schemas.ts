import { z } from 'zod';

export const searchSourceSchema = z.enum(['google', 'youtube', 'reddit']);

export const chatBodySchema = z.object({
  message: z.string().min(1).max(32_000),
  conversationId: z.string().optional(),
  documentIds: z.array(z.string()).optional(),
  explicitContext: z.array(z.string().max(8_000)).max(20).optional(),
  sourceLink: z
    .object({
      quantumChatPeerId: z.string().optional(),
      groupId: z.string().optional(),
    })
    .optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional().default(false),
  ephemeral: z.boolean().optional().default(false),
  webSearch: z.boolean().optional().default(false),
  searchSources: z.array(searchSourceSchema).min(1).max(3).optional(),
});

export const searchBodySchema = z.object({
  query: z.string().min(1).max(500),
  sources: z.array(searchSourceSchema).min(1).max(3).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentIds: z.array(z.string()).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
}).refine((v) => v.title != null || v.pinned != null || v.archived != null, {
  message: 'At least one of title, pinned, or archived is required',
});

export const deleteLastMessagesSchema = z.object({
  count: z.number().int().min(1).max(20).optional().default(1),
});

export const documentQuestionSchema = z.object({
  question: z.string().min(1).max(8_000),
  conversationId: z.string().optional(),
});

export const quizSchema = z.object({
  count: z.number().int().min(3).max(30).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  gradeLevel: z.string().max(100).optional(),
});

export const presentationSchema = z.object({
  subject: z.string().max(200).optional(),
  gradeLevel: z.string().max(100).optional(),
  sloTopics: z.array(z.string().max(200)).max(20).optional(),
});

export const objectIdParamSchema = z.object({
  id: z.string().min(1),
});

export const authRegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).optional(),
});

export const authLoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});
