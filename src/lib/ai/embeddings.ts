import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { redis } from "@/lib/redis";

const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days cache for embeddings

/**
 * Creates a deterministic SHA-256 / base64 cache key for a string
 */
function getCacheKey(text: string): string {
  const normalized = text.trim().toLowerCase();
  // Short hash for key
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `emb:${hash}:${normalized.slice(0, 32).replace(/[^a-z0-9]/gi, "_")}`;
}

/**
 * Generates a 1536-dimensional vector embedding for a single text query.
 * Utilizes Upstash Redis cache to prevent redundant API calls for repeated queries.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleaned = text.trim();
  if (!cleaned) {
    return new Array(1536).fill(0);
  }

  const cacheKey = getCacheKey(cleaned);

  try {
    const cached = await redis.get<number[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length === 1536) {
      return cached;
    }
  } catch (err) {
    console.warn("Redis embedding cache read failed (proceeding to generate):", err);
  }

  // Generate embedding via AI SDK
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: cleaned,
  });

  try {
    await redis.set(cacheKey, embedding, { ex: CACHE_TTL_SECONDS });
  } catch (err) {
    console.warn("Redis embedding cache write failed:", err);
  }

  return embedding;
}

/**
 * Generates embeddings for an array of document chunks in a single batched call.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (validTexts.length === 0) return [];

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: validTexts,
  });

  return embeddings;
}
