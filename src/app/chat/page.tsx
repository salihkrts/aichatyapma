"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, Bot, AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageItem, type ChatMessage } from "@/components/chat/chat-message-item";
import { ChatInputBar } from "@/components/chat/chat-input-bar";
import { TimelineBranchModal } from "@/components/chat/timeline-branch-modal";
import { editMessageAction, deleteChatAction } from "@/app/actions/chat";
import type { Character, Chat, ChatWithCharacter } from "@/types/database";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterIdParam = searchParams.get("characterId");
  const chatIdParam = searchParams.get("chatId");

  const [chats, setChats] = useState<ChatWithCharacter[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(chatIdParam);
  const [character, setCharacter] = useState<Character | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [branchingMessage, setBranchingMessage] = useState<ChatMessage | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // 1. Fetch user's chats
  const loadUserChats = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;

    const { data, error } = await supabase
      .from("chats")
      .select("*, characters!chats_character_id_fkey(name, avatar_url, tagline)")
      .eq("user_id", userRes.user.id)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!error && data) {
      setChats(data as unknown as ChatWithCharacter[]);
    }
  }, [supabase]);

  useEffect(() => {
    loadUserChats();
  }, [loadUserChats]);

  // 2. Load character details
  useEffect(() => {
    async function loadCharacter() {
      let charId = characterIdParam;

      if (!charId && activeChatId) {
        const { data: chat } = await supabase
          .from("chats")
          .select("character_id, *")
          .eq("id", activeChatId)
          .single();

        if (chat) {
          charId = chat.character_id;
          setActiveChat(chat);
        }
      }

      if (charId) {
        const { data: char } = await supabase
          .from("characters")
          .select("*")
          .eq("id", charId)
          .single();

        if (char) {
          setCharacter(char);
        }
      }
    }

    loadCharacter();
  }, [characterIdParam, activeChatId, supabase]);

  // 3. Load messages for active chat
  useEffect(() => {
    async function loadMessages() {
      if (!activeChatId) {
        // If new chat with a character, display character's initial greeting
        if (character?.greeting_message) {
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: character.greeting_message,
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages([]);
        }
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", activeChatId)
        .eq("is_active_variant", true)
        .order("sequence_number", { ascending: true });

      if (!error && data) {
        if (data.length === 0 && character?.greeting_message) {
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: character.greeting_message,
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages(data as ChatMessage[]);
        }
      }
    }

    loadMessages();
  }, [activeChatId, character, supabase]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // 4. Send message with real-time streaming
  const handleSendMessage = async (text: string) => {
    if (!character || isLoading) return;

    const userMessageText = text;
    const tempUserMsgId = `temp-${Date.now()}`;
    const tempAssistantMsgId = `assistant-${Date.now()}`;

    // Optimistically append user message
    const updatedMessages: ChatMessage[] = [
      ...messages,
      {
        id: tempUserMsgId,
        role: "user",
        content: userMessageText,
        created_at: new Date().toISOString(),
      },
    ];

    setMessages(updatedMessages);
    setReplyTarget(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          characterId: character.id,
          message: userMessageText,
          workingHistory: updatedMessages.slice(-20),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      // Check if new chat was created, extract x-chat-id header
      const returnedChatId = response.headers.get("x-chat-id");
      if (returnedChatId && returnedChatId !== activeChatId) {
        setActiveChatId(returnedChatId);
        loadUserChats();
      }

      // Prepare assistant placeholder message
      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantMsgId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);

      // Stream word-by-word
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedAssistantText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedAssistantText += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId
                ? { ...msg, content: accumulatedAssistantText }
                : msg
            )
          );
          scrollToBottom(true);
        }
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "system",
          content: `⚠️ Failed to receive response: ${err instanceof Error ? err.message : "Network error"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      loadUserChats();
    }
  };

  // 5. In-place message edit
  const handleEditMessage = async (messageId: string, newContent: string) => {
    const res = await editMessageAction(messageId, newContent);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: newContent, is_edited: true }
            : m
        )
      );
    }
  };

  // 6. Regenerate response
  const handleRegenerate = (messageId: string) => {
    // Find the previous user prompt and re-trigger
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex > 0) {
      const prevUserMsg = messages[msgIndex - 1];
      if (prevUserMsg && prevUserMsg.role === "user") {
        handleSendMessage(prevUserMsg.content);
      }
    }
  };

  // 7. Branch timeline
  const handleBranchClick = (messageId: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (targetMsg) {
      setBranchingMessage(targetMsg);
      setBranchModalOpen(true);
    }
  };

  const handleBranchCreated = (newChatId: string) => {
    setActiveChatId(newChatId);
    loadUserChats();
    router.push(`/chat?chatId=${newChatId}`);
  };

  const handleDeleteChat = async (chatId: string) => {
    const res = await deleteChatAction(chatId);
    if (res.success) {
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      loadUserChats();
    }
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-white overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-1/4 size-[550px] rounded-full bg-purple-900/10 blur-[150px]" />
        <div className="absolute bottom-10 right-1/4 size-[550px] rounded-full bg-blue-900/10 blur-[150px]" />
      </div>

      {/* Sidebar: Past Chats & Branch Timelines */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          router.push(`/chat?chatId=${id}`);
        }}
        onNewChat={() => {
          setActiveChatId(null);
          setMessages([]);
          router.push(character ? `/chat?characterId=${character.id}` : "/");
        }}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative z-10 min-w-0">
        {/* Header */}
        <ChatHeader
          character={character}
          activeChat={activeChat}
          onForkCharacter={() => router.push(`/character/create`)}
        />

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 space-y-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                characterName={character?.name}
                characterAvatar={character?.avatar_url}
                onEdit={handleEditMessage}
                onRegenerate={handleRegenerate}
                onBranch={handleBranchClick}
                onReply={(target) => setReplyTarget(target)}
              />
            ))}

            {/* "Character is thinking..." Skeletal Loader */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-2 text-xs text-neutral-400"
              >
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <Sparkles className="size-3.5 text-purple-400 animate-spin" />
                  <span className="font-mono text-purple-300">
                    {character?.name || "Persona"} is contemplating reality...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Input Pill */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          replyToMessage={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          placeholder={
            character
              ? `Speak with ${character.name}...`
              : "Message your persona..."
          }
        />
      </main>

      {/* Timeline Branching Modal */}
      {activeChatId && (
        <TimelineBranchModal
          open={branchModalOpen}
          onOpenChange={setBranchModalOpen}
          parentChatId={activeChatId}
          branchPointMessage={branchingMessage}
          onBranchCreated={handleBranchCreated}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-white font-mono text-xs">
          Loading Neural Matrix...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
