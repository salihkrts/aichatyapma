import { createClient } from "@/lib/supabase/client";
import type {
  Character,
  CharacterWithCreator,
  Chat,
  ChatWithCharacter,
  Message,
  MessageUpdate,
  Profile,
  CharacterCategory,
} from "@/types/database";

// ============================================================
// Supabase Client Helper (browser-side)
// ============================================================
const supabase = () => createClient();

// ============================================================
// Profile Queries
// ============================================================
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// Character Queries
// ============================================================
export async function getPublicCharacters(
  category?: CharacterCategory,
  limit = 20,
  offset = 0
): Promise<CharacterWithCreator[]> {
  let query = supabase()
    .from("characters")
    .select("*, profiles!characters_creator_id_fkey(username, display_name, avatar_url)")
    .eq("is_public", true)
    .order("likes_count", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as CharacterWithCreator[]) ?? [];
}

export async function getCharacterById(
  characterId: string
): Promise<CharacterWithCreator | null> {
  const { data, error } = await supabase()
    .from("characters")
    .select("*, profiles!characters_creator_id_fkey(username, display_name, avatar_url)")
    .eq("id", characterId)
    .single();

  if (error) throw error;
  return data as unknown as CharacterWithCreator;
}

export async function getUserCharacters(
  userId: string
): Promise<Character[]> {
  const { data, error } = await supabase()
    .from("characters")
    .select("*")
    .eq("creator_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function searchCharacters(
  query: string,
  limit = 20
): Promise<CharacterWithCreator[]> {
  const { data, error } = await supabase()
    .from("characters")
    .select("*, profiles!characters_creator_id_fkey(username, display_name, avatar_url)")
    .eq("is_public", true)
    .ilike("name", `%${query}%`)
    .order("likes_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as CharacterWithCreator[]) ?? [];
}

export async function toggleCharacterLike(
  userId: string,
  characterId: string
): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase()
    .from("character_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase()
      .from("character_likes")
      .delete()
      .eq("user_id", userId)
      .eq("character_id", characterId);
    if (error) throw error;
    return false;
  } else {
    // Like
    const { error } = await supabase()
      .from("character_likes")
      .insert({ user_id: userId, character_id: characterId });
    if (error) throw error;
    return true;
  }
}

export async function isCharacterLiked(
  userId: string,
  characterId: string
): Promise<boolean> {
  const { data } = await supabase()
    .from("character_likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("character_id", characterId)
    .single();

  return !!data;
}

// ============================================================
// Chat Queries
// ============================================================
export async function getUserChats(
  userId: string
): Promise<ChatWithCharacter[]> {
  const { data, error } = await supabase()
    .from("chats")
    .select("*, characters!chats_character_id_fkey(name, avatar_url, tagline)")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data as unknown as ChatWithCharacter[]) ?? [];
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  const { data, error } = await supabase()
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single();

  if (error) throw error;
  return data;
}

export async function createChat(
  userId: string,
  characterId: string,
  title?: string
): Promise<Chat> {
  const { data, error } = await supabase()
    .from("chats")
    .insert({
      user_id: userId,
      character_id: characterId,
      title: title ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getChatBranches(
  parentChatId: string
): Promise<Chat[]> {
  const { data, error } = await supabase()
    .from("chats")
    .select("*")
    .eq("parent_chat_id", parentChatId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Message Queries
// ============================================================
export async function getChatMessages(
  chatId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .eq("is_active_variant", true)
    .order("sequence_number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function getMessageVariants(
  parentMessageId: string
): Promise<Message[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("*")
    .eq("parent_message_id", parentMessageId)
    .order("variant_index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateMessage(
  messageId: string,
  content: string
): Promise<Message> {
  // First get original content if not already edited
  const { data: existing } = await supabase()
    .from("messages")
    .select("content, is_edited, edit_count")
    .eq("id", messageId)
    .single();

  const updates: MessageUpdate = {
    content,
    is_edited: true,
    edit_count: existing?.edit_count ? existing.edit_count + 1 : 1,
  };

  // Preserve original content on first edit
  if (existing && !existing.is_edited) {
    updates.original_content = existing.content;
  }

  const { data, error } = await supabase()
    .from("messages")
    .update(updates)
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
