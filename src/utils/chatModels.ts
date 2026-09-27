/**
 * Groq exposes every model on the account (chat, STT, TTS, guards).
 * The assistant API should only surface chat-capable LLMs.
 */

/** Groq shut these down for free/developer accounts. Chat calls return 404. */
const RETIRED_CHAT_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-3.3-70b-specdec',
  'meta-llama/llama-4-scout-17b-16e-instruct',
]);

const REPLACEMENT_CHAT_MODEL = 'openai/gpt-oss-120b';

const NON_CHAT_PATTERNS = [
  /whisper/i,
  /transcri/i,
  /speech/i,
  /tts/i,
  /orpheus/i,
  /audio/i,
  /prompt-guard/i,
  /safeguard/i,
  /guard[-_]?2/i,
  /embed/i,
  /rerank/i,
];

export const PREFERRED_CHAT_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'groq/compound-mini',
  'allam-2-7b',
] as const;

export function isChatModel(modelId: string): boolean {
  const id = modelId.trim();
  if (!id || RETIRED_CHAT_MODELS.has(id)) return false;
  return !NON_CHAT_PATTERNS.some((pattern) => pattern.test(id));
}

/** Swap a retired Groq id for a model that still accepts chat requests. */
export function resolveChatModel(modelId: string | undefined, fallback = REPLACEMENT_CHAT_MODEL): string {
  const requested = modelId?.trim();
  if (requested && !RETIRED_CHAT_MODELS.has(requested)) return requested;
  const next = fallback.trim();
  return next && !RETIRED_CHAT_MODELS.has(next) ? next : REPLACEMENT_CHAT_MODEL;
}

export function filterChatModels(modelIds: string[]): string[] {
  const chat = [...new Set(modelIds.filter(isChatModel))];

  chat.sort((a, b) => {
    const ai = PREFERRED_CHAT_MODELS.indexOf(a as (typeof PREFERRED_CHAT_MODELS)[number]);
    const bi = PREFERRED_CHAT_MODELS.indexOf(b as (typeof PREFERRED_CHAT_MODELS)[number]);
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });

  return chat;
}
