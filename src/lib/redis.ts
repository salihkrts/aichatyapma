import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ============================================================
// Safe In-Memory Fallback for Development & Build Time
// ============================================================
const memoryStore = new Map<string, { value: unknown; expiresAt?: number }>();

class MemoryRedisMock {
  async get<T = unknown>(key: string): Promise<T | null> {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<"OK"> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    memoryStore.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return memoryStore.delete(key) ? 1 : 0;
  }
}

const isRealRedisConfigured =
  process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://") &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = (
  isRealRedisConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : new MemoryRedisMock()
) as unknown as Redis;

// ============================================================
// Rate Limiters
// ============================================================
const createRatelimit = (requests: number, prefix: string) => {
  if (isRealRedisConfigured) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, "1 m"),
      analytics: true,
      prefix,
    });
  }
  return null;
};

export const rateLimiters = {
  free: createRatelimit(20, "ratelimit:free"),
  pro: createRatelimit(60, "ratelimit:pro"),
  enterprise: createRatelimit(200, "ratelimit:enterprise"),
} as const;

export type UserTier = "free" | "pro" | "enterprise";

export class RateLimitError extends Error {
  public retryAfter: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public result: any;

  constructor(
    message: string,
    retryAfter: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result: any
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.result = result;
  }
}

/**
 * Check rate limit for a user based on their tier.
 * Returns { success, limit, remaining, reset } or throws on exceeded.
 */
export async function checkRateLimit(userId: string, tier: UserTier = "free") {
  const limiter = rateLimiters[tier];

  // If Upstash isn't configured in development, bypass check
  if (!limiter) {
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    };
  }

  const result = await limiter.limit(userId);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      result
    );
  }

  return result;
}

// ============================================================
// Short-term Context Cache (Recent messages for quick access)
// ============================================================
const CONTEXT_CACHE_TTL = 60 * 30; // 30 minutes

export async function cacheRecentMessages(
  chatId: string,
  messages: Array<{ role: string; content: string }>
) {
  const key = `chat:${chatId}:recent`;
  await redis.set(key, JSON.stringify(messages), { ex: CONTEXT_CACHE_TTL });
}

export async function getCachedMessages(
  chatId: string
): Promise<Array<{ role: string; content: string }> | null> {
  const key = `chat:${chatId}:recent`;
  const cached = await redis.get<string>(key);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached;
}

export async function invalidateChatCache(chatId: string) {
  const key = `chat:${chatId}:recent`;
  await redis.del(key);
}
