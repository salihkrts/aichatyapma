import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/ai/embeddings";

interface MessageSummaryItem {
  id: string;
  role: string;
  content: string;
}

const SUMMARY_INTERVAL_THRESHOLD = 20; // Trigger summarization every 20 messages

/**
 * Checks if a chat has exceeded the unsummarized message threshold,
 * and if so, synthesizes an episodic memory and embeds it into pgvector.
 */
export async function checkAndTriggerEpisodicSummary(
  chatId: string,
  userId: string,
  characterId: string
): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();

    // Check chat's unsummarized message count
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("summary_message_count, message_count")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) return;

    if (chat.summary_message_count < SUMMARY_INTERVAL_THRESHOLD) {
      return; // Not yet reached milestone
    }

    // Fetch the last unsummarized messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("chat_id", chatId)
      .eq("is_active_variant", true)
      .order("created_at", { ascending: false })
      .limit(SUMMARY_INTERVAL_THRESHOLD);

    if (msgError || !messages || messages.length === 0) return;

    const chronological = (messages as MessageSummaryItem[]).reverse();
    const formattedDialogue = chronological
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    // Synthesize episodic memory
    const { text: summaryText } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are an episodic memory synthesizer for an advanced AI character platform. Your task is to extract enduring plot milestones, emotional developments, secrets revealed, and mutual commitments from the dialogue.",
      prompt: `Summarize the following recent conversation segment into an episodic memory narrative (2-4 concise paragraphs):
- Highlight important topics discussed
- Emotional shifts or changes in character dynamics
- Key promises, decisions, or milestones reached

Dialogue:
${formattedDialogue}`,
    });

    if (!summaryText || summaryText.trim().length === 0) return;

    // Generate vector embedding for episodic summary
    const embedding = await generateEmbedding(summaryText);
    const embeddingString = `[${embedding.join(",")}]`;

    // Insert into memories table
    const fromMsgId = chronological[0]?.id || null;
    const toMsgId = chronological[chronological.length - 1]?.id || null;

    await supabase.from("memories").insert({
      user_id: userId,
      character_id: characterId,
      chat_id: chatId,
      memory_type: "episodic",
      content: summaryText,
      summary: summaryText.slice(0, 300),
      embedding: embeddingString as unknown as string,
      importance_score: 0.75,
      from_message_id: fromMsgId,
      to_message_id: toMsgId,
      message_range_count: chronological.length,
    });

    // Reset summary counter on chat
    await supabase
      .from("chats")
      .update({
        summary_message_count: 0,
        last_summary_at: new Date().toISOString(),
      })
      .eq("id", chatId);
  } catch (err) {
    console.warn("Episodic summarization non-critical warning:", err);
  }
}
