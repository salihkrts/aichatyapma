"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ChatActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a new chat session for a character
 */
export async function createChatAction(
  characterId: string,
  initialTitle?: string
): Promise<ChatActionResponse<{ chatId: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: chat, error: insertError } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        character_id: characterId,
        title: initialTitle || "New Conversation",
      })
      .select("id")
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: { chatId: chat.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create chat",
    };
  }
}

/**
 * Timeline Branching (Git for Chat):
 * Branches off from a specific message point, creating a parallel timeline
 * with all historical messages cloned up to the branch point.
 */
export async function createTimelineBranchAction({
  parentChatId,
  branchPointMessageId,
  branchLabel,
}: {
  parentChatId: string;
  branchPointMessageId: string;
  branchLabel?: string;
}): Promise<ChatActionResponse<{ newChatId: string }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch parent chat details
    const { data: parentChat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", parentChatId)
      .eq("user_id", user.id)
      .single();

    if (chatError || !parentChat) {
      return { success: false, error: "Parent chat not found" };
    }

    // 2. Fetch the target branch point message
    const { data: branchMsg, error: msgError } = await supabase
      .from("messages")
      .select("sequence_number, created_at")
      .eq("id", branchPointMessageId)
      .single();

    if (msgError || !branchMsg) {
      return { success: false, error: "Branch point message not found" };
    }

    // 3. Create the new branched chat session
    const autoLabel =
      branchLabel || `Branch from ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const { data: newBranchChat, error: newChatError } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        character_id: parentChat.character_id,
        title: `${parentChat.title || "Chat"} (${autoLabel})`,
        parent_chat_id: parentChat.id,
        branch_point_message_id: branchPointMessageId,
        branch_label: autoLabel,
      })
      .select("id")
      .single();

    if (newChatError || !newBranchChat) {
      return { success: false, error: newChatError?.message || "Failed to create branch" };
    }

    // 4. Fetch all messages up to the branch point sequence
    const { data: historyToClone, error: historyError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", parentChatId)
      .eq("is_active_variant", true)
      .lte("sequence_number", branchMsg.sequence_number)
      .order("sequence_number", { ascending: true });

    if (historyError) {
      return { success: false, error: historyError.message };
    }

    // 5. Clone these messages into the new branch chat
    if (historyToClone && historyToClone.length > 0) {
      const clonedMessages = historyToClone.map((m) => ({
        chat_id: newBranchChat.id,
        role: m.role,
        content: m.content,
        sequence_number: m.sequence_number,
        is_edited: m.is_edited,
        original_content: m.original_content,
        model_used: m.model_used,
        metadata: m.metadata,
      }));

      await supabase.from("messages").insert(clonedMessages);
    }

    revalidatePath("/chat");
    return {
      success: true,
      data: { newChatId: newBranchChat.id },
    };
  } catch (err: unknown) {
    console.error("Timeline branching error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to branch timeline",
    };
  }
}

/**
 * In-place message edit (preserves original content for history)
 */
export async function editMessageAction(
  messageId: string,
  newContent: string
): Promise<ChatActionResponse<{ updated: boolean }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch existing message to check original content
    const { data: existing, error: fetchErr } = await supabase
      .from("messages")
      .select("content, is_edited, edit_count")
      .eq("id", messageId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: "Message not found" };
    }

    const { error: updateErr } = await supabase
      .from("messages")
      .update({
        content: newContent,
        is_edited: true,
        original_content: existing.is_edited ? undefined : existing.content,
        edit_count: (existing.edit_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, data: { updated: true } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to edit message",
    };
  }
}

/**
 * Switches between regeneration variants of an assistant message
 */
export async function switchMessageVariantAction(
  parentMessageId: string,
  targetVariantIndex: number
): Promise<ChatActionResponse<{ activeVariantId: string }>> {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Set all sibling variants to inactive
    await supabase
      .from("messages")
      .update({ is_active_variant: false })
      .eq("parent_message_id", parentMessageId);

    // 2. Set the target variant to active
    const { data: activated, error } = await supabase
      .from("messages")
      .update({ is_active_variant: true })
      .eq("parent_message_id", parentMessageId)
      .eq("variant_index", targetVariantIndex)
      .select("id")
      .single();

    if (error || !activated) {
      return { success: false, error: "Failed to switch variant" };
    }

    return { success: true, data: { activeVariantId: activated.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error switching variant",
    };
  }
}

/**
 * Deletes a chat session
 */
export async function deleteChatAction(
  chatId: string
): Promise<ChatActionResponse<{ deleted: boolean }>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/chat");
    return { success: true, data: { deleted: true } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete chat",
    };
  }
}
