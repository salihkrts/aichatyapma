import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";

const extractedFactSchema = z.object({
  hasFact: z.boolean().describe("Whether the user message disclosed any enduring personal fact, preference, interest, goal, or context"),
  facts: z.array(
    z.object({
      category: z.enum([
        "personal",
        "interest",
        "preference",
        "context",
        "relationship",
        "goal",
      ]),
      key: z
        .string()
        .describe(
          "Normalized concise identifier, e.g. occupation, favorite_book_genre, programming_language, location, pet, hobby, allergy"
        ),
      value: z
        .string()
        .describe(
          "Concise factual value, e.g. 'Software Engineer', 'Hard Sci-Fi', 'Rust', 'Tokyo'"
        ),
      confidence: z
        .number()
        .min(0.5)
        .max(1.0)
        .describe("Confidence score between 0.5 and 1.0"),
    })
  ),
});

/**
 * Background user profiling agent.
 * Silently extracts personal facts, hobbies, goals, and traits
 * from the user's conversational input and saves them to `user_preferences`.
 */
export async function extractAndPersistUserFacts(
  userId: string,
  characterId: string,
  messageContent: string,
  sourceMessageId?: string
): Promise<void> {
  // Ignore short messages, greetings, or trivial inputs
  if (!messageContent || messageContent.trim().length < 15) {
    return;
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: extractedFactSchema,
      prompt: `Analyze the following user message in a roleplay/assistant chat:
"${messageContent}"

Extract any enduring facts, explicit preferences, hobbies, occupations, goals, or personal traits disclosed by the user.
Ignore transient emotions, roleplay in-character actions, and one-off queries.
Only extract facts that are likely true about the person speaking.`,
    });

    if (!object.hasFact || !object.facts || object.facts.length === 0) {
      return;
    }

    const supabase = await createServiceRoleClient();

    for (const fact of object.facts) {
      // Upsert into user_preferences
      await supabase.from("user_preferences").upsert(
        {
          user_id: userId,
          character_id: characterId,
          fact_category: fact.category,
          fact_key: fact.key.toLowerCase().trim().replace(/\s+/g, "_"),
          fact_value: fact.value.trim(),
          confidence: fact.confidence,
          source_message_id: sourceMessageId || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,character_id,fact_key",
        }
      );
    }
  } catch (err) {
    // Fail silently in background to avoid disrupting chat
    console.warn("Background user profiling non-critical error:", err);
  }
}
