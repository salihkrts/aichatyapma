"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  Copy,
  Check,
  RotateCw,
  GitBranch,
  Edit2,
  Reply,
  ChevronLeft,
  ChevronRight,
  Bot,
  User,
  Trash2,
  Play,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { speakWithNeuralVoice, stopNeuralVoice } from "@/lib/voice/voices";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  is_edited?: boolean;
  model_used?: string | null;
  generation_time_ms?: number | null;
  variant_index?: number;
  total_variants?: number;
  speaker_id?: string;
  speaker_name?: string;
  speaker_avatar?: string | null;
  scene_snapshot_url?: string | null;
  d20_badge?: string | null;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  characterName?: string;
  characterAvatar?: string | null;
  userAvatar?: string | null;
  userDisplayName?: string;
  voiceId?: string;
  isLastMessage?: boolean;
  branchChoices?: string[];
  onSelectChoice?: (choice: string) => void;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onContinueSpeaking?: () => void;
  onBranch?: (messageId: string) => void;
  onReply?: (message: ChatMessage) => void;
  onSwitchVariant?: (messageId: string, targetVariant: number) => void;
}

function parseAndCleanContent(raw: string): { text: string; choices: string[] } {
  if (!raw) return { text: "", choices: [] };
  let text = raw;
  let choices: string[] = [];

  // Match [choices: ... with or without closing bracket
  const choicesMatch = text.match(/\[(?:choices|choice|seçenekler|actions):\s*([\s\S]*?)(?:\]|$)/i);
  if (choicesMatch) {
    const rawChoices = choicesMatch[1].trim();
    const splitItems = rawChoices.includes("|") ? rawChoices.split("|") : rawChoices.split(/\n+/);
    choices = splitItems
      .map((c) =>
        c
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[-*•]\s*/, "")
          .replace(/^["'«“]/, "")
          .replace(/["'»”]$/, "")
          .trim()
      )
      .filter((c) => c.length > 1)
      .slice(0, 3);
    text = text.replace(choicesMatch[0], "");
  }

  // Strip any lingering unclosed tags like [emotion: ...], [affection: ...], [hud: ...]
  text = text
    .replace(/\[(?:emotion|affection|delta_affection|hud|choices|choice|seçenekler|actions):[\s\S]*?(?:\]|$)/gi, "")
    .trim();

  return { text, choices };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CodeBlock({ className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl border border-white/10 bg-neutral-950/80 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/5 text-[11px] font-mono text-neutral-400">
        <span className="uppercase tracking-wider text-purple-300 font-semibold">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" /> Kopyalandı
            </>
          ) : (
            <>
              <Copy className="size-3" /> Kodu Kopyala
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono">
        <code className={className} {...props}>
          {children}
        </code>
      </div>
    </div>
  );
}

export function ChatMessageItem({
  message,
  characterName = "Karakter",
  characterAvatar,
  userAvatar,
  userDisplayName = "Sen",
  voiceId = "anime-girl-yuki",
  isLastMessage = false,
  branchChoices = [],
  onSelectChoice,
  onEdit,
  onDelete,
  onRegenerate,
  onContinueSpeaking,
  onBranch,
  onReply,
  onSwitchVariant,
}: ChatMessageItemProps) {
  const isUser = message.role === "user";
  const displayName = isUser ? userDisplayName : message.speaker_name || characterName;
  const displayAvatar = isUser ? userAvatar : message.speaker_avatar || characterAvatar;

  const { text: cleanContent, choices: extractedChoices } = useMemo(
    () => parseAndCleanContent(message.content),
    [message.content]
  );

  const activeChoices =
    extractedChoices.length > 0
      ? extractedChoices
      : isLastMessage && branchChoices && branchChoices.length > 0
      ? branchChoices
      : [];

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);

  const handleToggleSpeak = async () => {
    if (isSpeaking || isLoadingVoice) {
      stopNeuralVoice();
      setIsSpeaking(false);
      setIsLoadingVoice(false);
      return;
    }
    setIsLoadingVoice(true);
    await speakWithNeuralVoice({
      text: cleanContent || message.content,
      voiceId,
      onStart: () => {
        setIsLoadingVoice(false);
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsLoadingVoice(false);
        setIsSpeaking(false);
      },
      onError: () => {
        setIsLoadingVoice(false);
        setIsSpeaking(false);
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    try {
      setIsSubmittingEdit(true);
      await onEdit(message.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group relative flex gap-3 px-4 py-3 transition-colors ${
        isUser ? "flex-row-reverse" : "flex-row"
      } hover:bg-white/[0.015] rounded-2xl`}
    >
      {/* Avatar Icon */}
      <Avatar className="size-9 shrink-0 border border-white/10 shadow-md">
        {isUser ? (
          <>
            {displayAvatar ? (
              <AvatarImage
                src={displayAvatar}
                alt={displayName}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-purple-700 to-indigo-700 text-white text-xs font-bold">
              {displayName?.[0]?.toUpperCase() || <User className="size-4" />}
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage
              src={displayAvatar || undefined}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-tr from-neutral-800 to-neutral-900 text-purple-300 text-xs font-bold">
              <Bot className="size-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content Container */}
      <div
        className={`flex flex-col max-w-[85%] md:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Author Header */}
        <div className="flex items-center gap-2 mb-1 text-[11px] text-neutral-400">
          <span className="font-semibold text-neutral-200">{displayName}</span>
          {message.model_used && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 border-white/10 text-neutral-400 font-mono"
            >
              {message.model_used}
            </Badge>
          )}
          {message.is_edited && (
            <span className="text-[10px] text-neutral-500 italic">(düzenlendi)</span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-md ${
            isUser
              ? "bg-gradient-to-br from-purple-600/90 to-indigo-700/90 text-white rounded-tr-none border border-purple-500/30"
              : "bg-neutral-900/80 backdrop-blur-md text-neutral-100 rounded-tl-none border border-white/10"
          }`}
        >
          {isEditing ? (
            <div className="min-w-[280px] sm:min-w-[380px] space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="bg-black/50 border-white/20 text-xs text-white"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="text-xs h-7 text-neutral-400 hover:text-white"
                >
                  İptal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmittingEdit}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-7"
                >
                  Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    if (inline) {
                      return (
                        <code
                          className="bg-white/10 text-purple-200 px-1 py-0.5 rounded text-[12px] font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <CodeBlock className={className} {...props}>
                        {children}
                      </CodeBlock>
                    );
                  },
                  em({ children }) {
                    return (
                      <em className="text-purple-300/90 font-serif italic not-prose tracking-wide">
                        *{children}*
                      </em>
                    );
                  },
                  img({ src, alt }) {
                    if (!src) return null;
                    return (
                      <div className="my-3 rounded-2xl overflow-hidden border border-purple-500/40 bg-black/60 shadow-2xl not-prose">
                        <img
                          src={src}
                          alt={alt || "Canlı Sahne İllüstrasyonu"}
                          className="w-full max-h-80 object-cover"
                        />
                        {alt && (
                          <div className="px-3 py-1.5 text-[11px] text-purple-200 bg-purple-950/50 border-t border-white/10 flex items-center justify-between">
                            <span>📸 {alt}</span>
                            <a
                              href={typeof src === "string" ? src : "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-purple-300 underline hover:text-white"
                            >
                              Tam Boyut Aç ↗
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  },
                }}
              >
                {cleanContent || message.content}
              </ReactMarkdown>

              {/* RPG Branching & Action Choices */}
              {activeChoices.length > 0 && !isUser && (
                <div className="mt-3.5 pt-3 border-t border-white/10 space-y-2 not-prose">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold">
                    <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
                    <span>Hızlı Karar & Eylem Seçenekleri:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {activeChoices.map((choice, idx) => {
                      const cleanChoice = choice
                        .replace(/^\d+[\.\)]\s*/, "")
                        .replace(/^[-*•]\s*/, "")
                        .replace(/^["'«“]/, "")
                        .replace(/["'»”]$/, "")
                        .trim();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectChoice?.(cleanChoice)}
                          className="group/btn flex items-center gap-2 p-2.5 rounded-xl text-left text-xs bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 hover:border-purple-400 text-purple-100 transition shadow-sm hover:shadow-purple-500/20 active:scale-[0.99] cursor-pointer"
                        >
                          <span className="size-5 rounded-lg bg-purple-500/25 border border-purple-400/40 text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0 group-hover/btn:bg-purple-500 group-hover/btn:text-white transition">
                            {idx + 1}
                          </span>
                          <span className="line-clamp-2 leading-relaxed">{cleanChoice}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {message.scene_snapshot_url && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-pink-500/40 bg-black/60 shadow-2xl not-prose">
                  <img
                    src={message.scene_snapshot_url}
                    alt={`${displayName} - Canlı Sahne Anı`}
                    className="w-full max-h-80 object-cover"
                  />
                  <div className="px-3 py-1.5 text-[11px] text-pink-200 bg-pink-950/40 border-t border-white/10 flex items-center justify-between">
                    <span>📸 Canlı Sahne İllüstrasyonu ({displayName})</span>
                    <a
                      href={message.scene_snapshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-pink-300 underline hover:text-white"
                    >
                      Tam Ekran Gör ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visible Quick Action Bar Under Message */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {!isUser && message.content && (
            <button
              type="button"
              onClick={handleToggleSpeak}
              title={isSpeaking ? "Sesi Durdur" : "Bu mesajı karakterin kendi sesiyle dinle"}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border font-medium transition cursor-pointer ${
                isSpeaking
                  ? "bg-emerald-600/30 border-emerald-400/60 text-emerald-200 animate-pulse"
                  : "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {isLoadingVoice ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  <span>Ses Hazırlanıyor...</span>
                </>
              ) : isSpeaking ? (
                <>
                  <VolumeX className="size-3" />
                  <span>Sesi Durdur</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-3" />
                  <span>Seslendir</span>
                </>
              )}
            </button>
          )}

          {!isUser && onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(message.id)}
              title="Botun bu mesajını silip yeniden üret"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-neutral-300 hover:text-purple-200 transition cursor-pointer"
            >
              <RotateCw className="size-3" />
              <span className="hidden sm:inline">Yeniden Yaz</span>
              <span className="sm:hidden">Yenile</span>
            </button>
          )}

          {!isUser && isLastMessage && onContinueSpeaking && (
            <button
              type="button"
              onClick={onContinueSpeaking}
              title="Sen bir şey yazmadan bot konuşmaya devam etsin"
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 font-medium transition cursor-pointer"
            >
              <Play className="size-3 fill-current" />
              <span className="hidden sm:inline">Tekrar Konuşsun / Devam Etsin</span>
              <span className="sm:hidden">Devam Et</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Mesajı Düzenle"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <Edit2 className="size-3" />
            <span>Düzenle</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              title="Bu mesajı tamamen sil"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-red-500/20 border border-white/5 hover:border-red-500/30 text-neutral-400 hover:text-red-300 transition cursor-pointer"
            >
              <Trash2 className="size-3" />
              <span>Sil</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyMessage}
            title="Metni Kopyala"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-neutral-500 hover:text-white transition cursor-pointer"
          >
            {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          </button>

          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              title="Yanıtla"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-neutral-500 hover:text-white transition cursor-pointer"
            >
              <Reply className="size-3" />
            </button>
          )}

          {onBranch && (
            <button
              type="button"
              onClick={() => onBranch(message.id)}
              title="Buradan Yeni Evren Dallandır"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-neutral-500 hover:text-cyan-300 transition cursor-pointer"
            >
              <GitBranch className="size-3" />
            </button>
          )}

          {/* Multiple variants switcher (< 1 / 3 >) */}
          {message.total_variants && message.total_variants > 1 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
              <button
                onClick={() =>
                  onSwitchVariant &&
                  onSwitchVariant(message.id, (message.variant_index || 0) - 1)
                }
                disabled={(message.variant_index || 0) <= 0}
                className="hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="size-3" />
              </button>
              <span className="font-mono text-[9px]">
                {(message.variant_index || 0) + 1} / {message.total_variants}
              </span>
              <button
                onClick={() =>
                  onSwitchVariant &&
                  onSwitchVariant(message.id, (message.variant_index || 0) + 1)
                }
                disabled={(message.variant_index || 0) >= message.total_variants - 1}
                className="hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="size-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
