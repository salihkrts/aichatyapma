import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { retrieveCognitiveContext, type RetrievedCognitiveContext } from "@/lib/ai/memory-retriever";
import { synthesizeSystemPrompt } from "@/lib/ai/prompt-synthesizer";
import { extractAndPersistUserFacts } from "@/lib/ai/user-profiler";
import { checkAndTriggerEpisodicSummary } from "@/lib/ai/episodic-summarizer";
import type { Character, Profile } from "@/types/database";

export interface PrepareCognitiveBrainParams {
  characterId: string;
  userId: string;
  userMessage: string;
  chatId?: string;
  sourceMessageId?: string;
}

export interface CognitiveBrainResult {
  systemPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  character: Character;
  userProfile: Profile | null;
  cognitiveContext: RetrievedCognitiveContext;
  generationConfig: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}

/**
 * Core AI Utility Function: The Cognitive Brain
 *
 * 1. Fetches character profile.
 * 2. Fetches user profile.
 * 3. Performs vector similarity search on past memories & custom knowledge base based on user input.
 * 4. Synthesizes a massive, bulletproof, psychologically calibrated System Prompt.
 * 5. Prepares model provider (OpenAI GPT-4o / Anthropic Claude 3.5 Sonnet) and generation hyperparameters.
 * 6. Schedules background hooks for silent user profiling and episodic memory summarization.
 */
export async function prepareCognitiveBrain({
  characterId,
  userId,
  userMessage,
  chatId,
  sourceMessageId,
}: PrepareCognitiveBrainParams): Promise<CognitiveBrainResult> {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch character profile
  const { data: character, error: charError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (charError || !character) {
    throw new Error(
      `Character not found: ${charError ? charError.message : "Unknown ID"}`
    );
  }

  // 2. Fetch user profile
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // 3. Perform vector similarity search on past memories & knowledge
  const cognitiveContext = await retrieveCognitiveContext({
    userId,
    characterId,
    queryText: userMessage,
    memoryThreshold: 0.65,
    memoryLimit: 5,
    knowledgeThreshold: 0.68,
    knowledgeLimit: 4,
  });

  // 4. Construct bulletproof System Prompt
  const systemPrompt = synthesizeSystemPrompt({
    character,
    userProfile,
    userPreferences: cognitiveContext.userPreferences,
    memories: cognitiveContext.memories,
    knowledge: cognitiveContext.knowledge,
  });

  // 5. Configure Frontier Model & Hyperparameters
  const model =
    character.model_provider === "anthropic"
      ? anthropic(character.model_id || "claude-3-5-sonnet-20241022")
      : openai(character.model_id || "gpt-4o");

  const generationConfig = {
    temperature: Number(character.temperature ?? 0.85),
    maxTokens: Number(character.max_tokens ?? 2048),
    topP: Number(character.top_p ?? 0.95),
    frequencyPenalty: Number(character.frequency_penalty ?? 0),
    presencePenalty: Number(character.presence_penalty ?? 0),
  };

  // 6. Asynchronous Background Hooks (Do not block user streaming)
  // Background Hook A: Silent User Profiling (Fact extraction)
  extractAndPersistUserFacts(
    userId,
    characterId,
    userMessage,
    sourceMessageId
  ).catch((e) => console.warn("Background user profiler error:", e));

  // Background Hook B: Episodic Memory Summarization (if chatId provided)
  if (chatId) {
    checkAndTriggerEpisodicSummary(chatId, userId, characterId).catch((e) =>
      console.warn("Background episodic summary error:", e)
    );
  }

  return {
    systemPrompt,
    model,
    character,
    userProfile,
    cognitiveContext,
    generationConfig,
  };
}
