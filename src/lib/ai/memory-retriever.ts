import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/embeddings";
import type {
  MemorySearchResult,
  KnowledgeSearchResult,
  UserPreference,
} from "@/types/database";

export interface RetrievedCognitiveContext {
  memories: MemorySearchResult[];
  knowledge: KnowledgeSearchResult[];
  userPreferences: UserPreference[];
}

interface RetrieveContextParams {
  userId: string;
  characterId: string;
  queryText: string;
  memoryThreshold?: number;
  memoryLimit?: number;
  knowledgeThreshold?: number;
  knowledgeLimit?: number;
}

/**
 * Searches pgvector for memories associated with this user and character
 */
export async function retrieveRelevantMemories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  characterId: string,
  queryEmbedding: number[],
  matchThreshold = 0.65,
  matchCount = 5
): Promise<MemorySearchResult[]> {
  try {
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    const { data, error } = await supabase.rpc("search_memories", {
      p_user_id: userId,
      p_character_id: characterId,
      p_embedding: embeddingString,
      p_match_threshold: matchThreshold,
      p_match_count: matchCount,
    });

    if (error) {
      console.warn("RPC search_memories error (falling back to empty):", error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    // Re-rank results combining similarity and importance score
    const ranked = (data as MemorySearchResult[])
      .map((item) => ({
        ...item,
        hybridScore:
          item.similarity * 0.7 + Number(item.importance_score || 0.5) * 0.3,
      }))
      .sort((a, b) => b.hybridScore - a.hybridScore);

    return ranked;
  } catch (err) {
    console.error("Error retrieving memories:", err);
    return [];
  }
}

/**
 * Searches pgvector for domain knowledge chunks uploaded to this character
 */
export async function retrieveCharacterKnowledge(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  characterId: string,
  queryEmbedding: number[],
  matchThreshold = 0.68,
  matchCount = 4
): Promise<KnowledgeSearchResult[]> {
  try {
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    const { data, error } = await supabase.rpc("search_knowledge", {
      p_character_id: characterId,
      p_embedding: embeddingString,
      p_match_threshold: matchThreshold,
      p_match_count: matchCount,
    });

    if (error) {
      console.warn("RPC search_knowledge error (falling back to empty):", error.message);
      return [];
    }

    return (data as KnowledgeSearchResult[]) ?? [];
  } catch (err) {
    console.error("Error retrieving knowledge:", err);
    return [];
  }
}

/**
 * Fetches user preference facts known by this character or globally
 */
export async function retrieveUserPreferences(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  characterId: string
): Promise<UserPreference[]> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .or(`character_id.is.null,character_id.eq.${characterId}`)
      .order("confidence", { ascending: false })
      .limit(15);

    if (error) {
      console.warn("Error fetching user preferences:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("Error retrieving user preferences:", err);
    return [];
  }
}

/**
 * Master cognitive retrieval orchestrator.
 * Converts user query into an embedding and queries memory, RAG knowledge,
 * and user preference facts in parallel.
 */
export async function retrieveCognitiveContext({
  userId,
  characterId,
  queryText,
  memoryThreshold = 0.65,
  memoryLimit = 5,
  knowledgeThreshold = 0.68,
  knowledgeLimit = 4,
}: RetrieveContextParams): Promise<RetrievedCognitiveContext> {
  const supabase = await createServerSupabaseClient();

  // If query is empty or trivial, skip vector search
  if (!queryText || queryText.trim().length < 3) {
    const userPreferences = await retrieveUserPreferences(
      supabase,
      userId,
      characterId
    );
    return { memories: [], knowledge: [], userPreferences };
  }

  // Generate vector embedding for user query
  const queryEmbedding = await generateEmbedding(queryText);

  // Parallel vector searches across memories, knowledge chunks, and user preferences
  const [memories, knowledge, userPreferences] = await Promise.all([
    retrieveRelevantMemories(
      supabase,
      userId,
      characterId,
      queryEmbedding,
      memoryThreshold,
      memoryLimit
    ),
    retrieveCharacterKnowledge(
      supabase,
      characterId,
      queryEmbedding,
      knowledgeThreshold,
      knowledgeLimit
    ),
    retrieveUserPreferences(supabase, userId, characterId),
  ]);

  return {
    memories,
    knowledge,
    userPreferences,
  };
}
