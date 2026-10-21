"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { characterSchema, type CharacterFormData } from "@/lib/validations/character";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Server action to create a new AI character in Supabase.
 */
export async function createCharacterAction(
  formData: CharacterFormData
): Promise<ActionResponse<{ characterId: string }>> {
  try {
    const validatedData = characterSchema.parse(formData);
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const isDevMode =
      !url ||
      url.includes("placeholder") ||
      url.includes("your_") ||
      !url.startsWith("http");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isDevMode) {
        // Return a mock character id in dev mode so the user can immediately test
        const devCharId = `dev-char-${Date.now()}`;
        return {
          success: true,
          data: { characterId: devCharId },
        };
      }
      return {
        success: false,
        error: "Yetkisiz erişim: Karakter oluşturmak için giriş yapmalısınız.",
      };
    }

    // Insert character
    const { data: character, error: insertError } = await supabase
      .from("characters")
      .insert({
        creator_id: user.id,
        name: validatedData.name,
        tagline: validatedData.tagline || null,
        description: validatedData.description || null,
        avatar_url: validatedData.avatar_url || null,
        avatar_prompt: validatedData.avatar_prompt || null,
        voice_id: validatedData.voice_id || null,

        // Psychological profile
        trait_empathy: validatedData.trait_empathy,
        trait_humor: validatedData.trait_humor,
        trait_aggression: validatedData.trait_aggression,
        trait_formality: validatedData.trait_formality,
        trait_creativity: validatedData.trait_creativity,
        trait_curiosity: validatedData.trait_curiosity,
        trait_confidence: validatedData.trait_confidence,
        trait_warmth: validatedData.trait_warmth,

        // Deep Lore
        system_prompt: validatedData.system_prompt,
        backstory: validatedData.backstory || null,
        worldview: validatedData.worldview || null,
        secrets: validatedData.secrets || null,
        example_dialogues: validatedData.example_dialogues || null,

        // Guardrails
        never_talk_about: validatedData.never_talk_about,
        ooc_prevention_prompt: validatedData.ooc_prevention_prompt || null,

        // Greeting
        greeting_message: validatedData.greeting_message,

        // Category & tags
        category: validatedData.category,
        tags: validatedData.tags,

        // Visibility
        is_public: validatedData.is_public,
        is_nsfw: validatedData.is_nsfw,

        // Model Config
        model_provider: validatedData.model_provider,
        model_id: validatedData.model_id,
        temperature: validatedData.temperature,
        max_tokens: validatedData.max_tokens,
        top_p: validatedData.top_p,
        frequency_penalty: validatedData.frequency_penalty,
        presence_penalty: validatedData.presence_penalty,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating character:", insertError);
      return {
        success: false,
        error: `Database error: ${insertError.message}`,
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/community");

    return {
      success: true,
      data: { characterId: character.id },
    };
  } catch (err: unknown) {
    console.error("Unhandled character creation exception:", err);
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Server action to update an existing character.
 */
export async function updateCharacterAction(
  characterId: string,
  formData: Partial<CharacterFormData>
): Promise<ActionResponse<{ characterId: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized." };
    }

    const { error: updateError } = await supabase
      .from("characters")
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId)
      .eq("creator_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/character/${characterId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { characterId },
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Server action to fork an existing character.
 */
export async function forkCharacterAction(
  sourceCharacterId: string
): Promise<ActionResponse<{ newCharacterId: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized." };
    }

    // Fetch original character
    const { data: source, error: fetchError } = await supabase
      .from("characters")
      .select("*")
      .eq("id", sourceCharacterId)
      .single();

    if (fetchError || !source) {
      return { success: false, error: "Source character not found." };
    }

    // Insert as fork
    const { data: forked, error: forkError } = await supabase
      .from("characters")
      .insert({
        ...source,
        id: undefined, // Let db generate new UUID
        creator_id: user.id,
        name: `${source.name} (Fork)`,
        forked_from: source.id,
        total_chats: 0,
        total_messages: 0,
        likes_count: 0,
        forks_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (forkError) {
      return { success: false, error: forkError.message };
    }

    // Increment forks count on source
    await supabase
      .from("characters")
      .update({ forks_count: source.forks_count + 1 })
      .eq("id", source.id);

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { newCharacterId: forked.id },
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}
