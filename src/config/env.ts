import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import {
  isRetiredChatModel,
  REPLACEMENT_CHAT_MODEL,
  REPLACEMENT_VISION_MODEL,
  resolveChatModel,
} from '../utils/chatModels.js';

// Load .env first, then override with .env.production when NODE_ENV=production
dotenv.config();
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production'), override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5001),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  GROQ_CHAT_MODEL: z.string().default(REPLACEMENT_CHAT_MODEL),
  GROQ_VISION_MODEL: z.string().default(REPLACEMENT_VISION_MODEL),
  GROQ_MAX_COMPLETION_TOKENS: z.coerce.number().default(4096),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_ISSUER: z.string().default('quantum-ai'),
  // Shared with QuantumChat-Backend for signing AI response receipts.
  // Empty strings (e.g. unset CI secrets) are treated as missing.
  QUANTUM_AI_SERVICE_SECRET: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z
      .string({ required_error: 'Required' })
      .min(32, 'QUANTUM_AI_SERVICE_SECRET must be at least 32 characters')
  ),
  // Accept true/false/1/0/yes/no. Unset defaults to true in production so a
  // copied .env.example (AUTH_REQUIRED=false) cannot leave the live site open.
  AUTH_REQUIRED: z.preprocess((value) => {
    const productionDefault = process.env.NODE_ENV === 'production';
    if (value === undefined || value === null || String(value).trim() === '') {
      return productionDefault;
    }
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return productionDefault;
  }, z.boolean()),
  // local = disk (dev only); mongodb = GridFS (recommended on Vercel);
  // google-drive = optional remote Drive folder.
  STORAGE_PROVIDER: z.enum(['local', 'google-drive', 'mongodb']).default('local'),
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
  UPSTASH_REDIS_REST_URL: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().url().optional()
  ),
  UPSTASH_REDIS_REST_TOKEN: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : v),
    z.string().optional()
  ),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.flatten().fieldErrors;
  // During Vercel build the serverless bundle may evaluate imports before env vars are injected.
  // Don't kill the build process; fail clearly at request time instead.
  if (process.env.VERCEL === '1') {
    console.warn('Invalid environment configuration (deferred for Vercel):', details);
  } else {
    console.error('Invalid environment configuration:', details);
    process.exit(1);
  }
}

const fallback = {
  NODE_ENV: 'production' as const,
  PORT: 5001,
  API_PREFIX: '/api/v1',
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
  GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
  GROQ_CHAT_MODEL: REPLACEMENT_CHAT_MODEL,
  GROQ_VISION_MODEL: REPLACEMENT_VISION_MODEL,
  GROQ_MAX_COMPLETION_TOKENS: 4096,
  JWT_SECRET: process.env.JWT_SECRET ?? 'vercel-build-placeholder-secret',
  JWT_ISSUER: 'quantum-ai',
  QUANTUM_AI_SERVICE_SECRET: process.env.QUANTUM_AI_SERVICE_SECRET || 'vercel-build-placeholder-service-secret',
  AUTH_REQUIRED: true,
  STORAGE_PROVIDER: (process.env.VERCEL ? 'mongodb' : 'local') as 'local' | 'mongodb',
  UPLOAD_DIR: './uploads',
  GOOGLE_DRIVE_FOLDER_ID: undefined as string | undefined,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: undefined as string | undefined,
  GOOGLE_PRIVATE_KEY: undefined as string | undefined,
  MAX_EXTRACTED_TEXT_CHARS: 500_000,
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_REQUEST: 10,
  RATE_LIMIT_WINDOW_MS: 900_000,
  RATE_LIMIT_MAX: 100,
  AI_RATE_LIMIT_MAX: 30,
  UPSTASH_REDIS_REST_URL: undefined as string | undefined,
  UPSTASH_REDIS_REST_TOKEN: undefined as string | undefined,
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'info' as const,
};

const data = parsed.success ? parsed.data : fallback;
const isProduction = data.NODE_ENV === 'production';

if (isRetiredChatModel(data.GROQ_CHAT_MODEL) || isRetiredChatModel(data.GROQ_VISION_MODEL)) {
  console.warn(
    '[config] Replacing retired Groq model ids. Set GROQ_CHAT_MODEL=openai/gpt-oss-120b and GROQ_VISION_MODEL=qwen/qwen3.6-27b in the host env (e.g. Vercel).'
  );
}

const resolvedChatModel = resolveChatModel(data.GROQ_CHAT_MODEL, REPLACEMENT_CHAT_MODEL);
const resolvedVisionModel = resolveChatModel(data.GROQ_VISION_MODEL, REPLACEMENT_VISION_MODEL);

if (isProduction && !data.AUTH_REQUIRED) {
  console.warn(
    'AUTH_REQUIRED=false was ignored because NODE_ENV=production. Login is required on the live site.'
  );
}

export const config = {
  ...data,
  GROQ_CHAT_MODEL: resolvedChatModel,
  GROQ_VISION_MODEL: resolvedVisionModel,
  isProduction,
  // Never allow the X-User-Id impersonation bypass on a production host.
  // app.ts also fail-closes if this is ever false in production.
  AUTH_REQUIRED: isProduction ? true : data.AUTH_REQUIRED,
  maxFileSizeBytes: data.MAX_FILE_SIZE_MB * 1024 * 1024,
};

export type AppConfig = typeof config;
