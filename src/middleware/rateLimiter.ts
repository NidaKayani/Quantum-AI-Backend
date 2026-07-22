import rateLimitImport from 'express-rate-limit';
import type { Options, RateLimitRequestHandler, Store } from 'express-rate-limit';
import { Redis } from '@upstash/redis';
import { config } from '../config/index.js';

/** express-rate-limit CJS typings are not callable under NodeNext + TS 5.9. */
const rateLimit = rateLimitImport as unknown as (options: Partial<Options>) => RateLimitRequestHandler;

class UpstashRateLimitStore implements Store {
  private windowMs = 60_000;

  constructor(private readonly redis: Redis, private readonly keyPrefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string) {
    const redisKey = `${this.keyPrefix}:${key}`;
    const totalHits = await this.redis.incr(redisKey);
    if (totalHits === 1) await this.redis.pexpire(redisKey, this.windowMs);
    const ttl = await this.redis.pttl(redisKey);
    return {
      totalHits,
      resetTime: new Date(Date.now() + Math.max(ttl, 0)),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`${this.keyPrefix}:${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.keyPrefix}:${key}`);
  }
}

const redis =
  config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

function store(prefix: string): Store | undefined {
  return redis ? new UpstashRateLimitStore(redis, prefix) : undefined;
}

export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: store('quantum-ai:global'),
  message: { success: false, error: 'Too many requests', code: 'RATE_LIMIT' },
});

export const aiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: store('quantum-ai:ai'),
  message: { success: false, error: 'AI rate limit exceeded', code: 'AI_RATE_LIMIT' },
});
