import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  GROQ_CHAT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_VISION_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),
  GROQ_MAX_COMPLETION_TOKENS: z.coerce.number().default(4096),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ISSUER: z.string().default('quantum-chat'),
  QUANTUM_AI_SERVICE_SECRET: z.string().min(32).optional(),
  AUTH_REQUIRED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  STORAGE_PROVIDER: z.enum(['local', 'google-drive']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  MAX_EXTRACTED_TEXT_CHARS: z.coerce.number().positive().default(500_000),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  MAX_FILES_PER_REQUEST: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  AI_RATE_LIMIT_MAX: z.coerce.number().default(30),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  maxFileSizeBytes: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
};

export type AppConfig = typeof config;
