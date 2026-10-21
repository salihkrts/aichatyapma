"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  Paperclip,
  X,
  CornerDownLeft,
  Image as ImageIcon,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/components/chat/chat-message-item";

interface ChatInputBarProps {
  onSendMessage: (message: string, visionImageNote?: string) => void;
  isLoading: boolean;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  placeholder?: string;
  suggestions?: string[];
  branchChoices?: string[];
}

export function ChatInputBar({
  onSendMessage,
  isLoading,
  replyToMessage,
  onCancelReply,
  placeholder = "Karakterine bir şey yaz... (Göndermek için Enter)",
  suggestions = [],
  branchChoices = [],
}: ChatInputBarProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live recording timer (00:12 format) while dictating
  useEffect(() => {
    if (!isListening) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isListening]);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedImagePreview) || isLoading) return;

    if (isListening) {
      stopVoiceDictation();
    }

    const visionNote = attachedImagePreview
      ? `Kullanıcı "${attachedImageName || "soru_gorseli.png"}" adlı bir görsel/soru fotoğrafı paylaştı. Görseldeki problemi veya sahneyi adım adım Sokratik/karakteristik biçimde analiz et.`
      : undefined;

    onSendMessage(
      trimmed || "📷 [Görsel / Soru Fotoğrafı Gönderildi] Bu görseli inceler misin?",
      visionNote
    );
    setInput("");
    setAttachedImagePreview(null);
    setAttachedImageName("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    if (isLoading) return;
    onSendMessage(suggestionText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Ses İle Yazma (Gerçek Mikrofon + Groq Whisper STT + Canlı Ses Dalgası)
  const toggleVoiceDictation = async () => {
    if (isListening) {
      stopVoiceDictation();
      return;
    }

    setIsListening(true);
    audioChunksRef.current = [];

    // 1. Tarayıcı SpeechRecognition varsa anlık önizleme için başlat
    const SpeechRec =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null;

    if (typeof SpeechRec === "function") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new (SpeechRec as any)();
        recognition.lang = "tr-TR";
        recognition.continuous = true;
        recognition.interimResults = true;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setInput(transcript);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // ignore, MediaRecorder + Whisper devrede
      }
    }

    // 2. Gerçek Mikrofon Kaydı + Groq Whisper-Large-V3-Turbo STT
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = audioChunksRef.current;
          audioChunksRef.current = [];

          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }

          if (chunks.length === 0) return;
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 400) return;

          try {
            const fd = new FormData();
            fd.append("file", blob, "voice.webm");
            const res = await fetch("/api/voice/stt", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text && String(data.text).trim()) {
                setInput((prev) =>
                  prev && prev.trim().length > String(data.text).trim().length
                    ? prev
                    : String(data.text).trim()
                );
              }
            }
          } catch {
            // ignore
          }
        };

        recorder.start();
        return;
      } catch {
        // Mikrofon izni verilmediyse
        setIsListening(false);
        return;
      }
    }
  };

  const stopVoiceDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImagePreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="relative p-2.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent">
      {/* Suggestions Chips Bar */}
      {suggestions.length > 0 && (
        <div className="max-w-4xl mx-auto mb-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSuggestionClick(suggestion)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-neutral-900/80 hover:bg-purple-950/40 border border-white/10 hover:border-purple-500/40 text-neutral-300 hover:text-purple-200 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. CANLI SES İLE YAZARKEN SES DALGASI ANİMASYONU (Animated Voice Waveform Banner) */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 8 }}
            className="max-w-4xl mx-auto mb-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-purple-950/70 to-indigo-950/70 border border-pink-500/50 shadow-lg shadow-pink-600/15">
              <div className="flex items-center gap-3">
                <span className="relative flex size-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-3 bg-rose-500" />
                </span>
                <Volume2 className="size-4 text-pink-300 animate-pulse" />
                <span className="text-xs font-bold text-pink-200">
                  Canlı Ses Algılanıyor ve Metne Dökülüyor (STT)...
                </span>

                {/* 14-Bar Animated Equalizer Waveform */}
                <div className="flex items-center gap-1 h-6 px-2">
                  {[0.4, 0.9, 0.6, 1.0, 0.5, 0.85, 0.35, 0.95, 0.65, 0.8, 0.45, 0.9, 0.55, 0.75].map(
                    (peak, i) => (
                      <motion.span
                        key={i}
                        animate={{
                          scaleY: [0.25, peak, 0.3, peak * 0.85, 0.25],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.65 + (i % 4) * 0.12,
                          ease: "easeInOut",
                        }}
                        className="w-1 h-5 rounded-full bg-gradient-to-t from-purple-400 via-pink-400 to-rose-300 origin-center"
                      />
                    )
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={stopVoiceDictation}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-[11px] font-semibold text-rose-200 transition cursor-pointer"
              >
                Durdur
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Attached Vision Image Preview */}
      {attachedImagePreview && (
        <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
          <div className="flex items-center gap-3">
            <img
              src={attachedImagePreview}
              alt="Eklenen Görsel"
              className="size-11 rounded-lg object-cover border border-indigo-400/40"
            />
            <div>
              <div className="font-bold flex items-center gap-1.5 text-indigo-200">
                <ImageIcon className="size-3.5 text-indigo-400" />
                <span>Görsel / Soru Fotoğrafı Hazır (Vision Analizi):</span>
              </div>
              <span className="text-[11px] text-neutral-400">{attachedImageName}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAttachedImagePreview(null);
              setAttachedImageName("");
            }}
            className="size-6 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 5. Reply Banner */}
      {replyToMessage && (
        <div className="max-w-4xl mx-auto mb-2 flex items-center justify-between p-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200">
          <div className="flex items-center gap-2 truncate">
            <CornerDownLeft className="size-3.5 text-purple-400 shrink-0" />
            <span className="font-semibold text-purple-300">
              Yanıtlanan mesaj:
            </span>
            <span className="truncate italic text-neutral-300">
              &ldquo;{replyToMessage.content}&rdquo;
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="size-5 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* 6. Main Glassmorphic Input Pill */}
      <div
        className={`max-w-4xl mx-auto relative flex items-end gap-2 p-2 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all ${
          isListening
            ? "border-pink-500/70 bg-neutral-900/95 ring-2 ring-pink-500/25"
            : "border-white/15 bg-neutral-900/90 focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          title="Soru Fotoğrafı veya Görsel Yükle (Vision)"
          className="size-9 shrink-0 text-neutral-400 hover:text-purple-300 hover:bg-white/5 rounded-xl"
        >
          <Paperclip className="size-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? "🎙️ Konuşun, sesiniz dalga animasyonuyla anlık metne dönüşüyor..."
              : placeholder
          }
          rows={1}
          disabled={isLoading}
          className="flex-1 min-h-[38px] max-h-[180px] py-2 px-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder:text-neutral-500 focus-visible:ring-0 resize-none leading-relaxed"
        />

        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {isListening && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-500/40">
              <span className="size-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-mono font-bold text-rose-200">
                {formatTimer(recordingSeconds)}
              </span>
              <div className="flex items-center gap-0.5 h-4">
                {[0.4, 0.95, 0.55, 1.0, 0.65, 0.85].map((p, idx) => (
                  <motion.span
                    key={idx}
                    animate={{ scaleY: [0.25, p, 0.3, p * 0.9, 0.25] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.55 + idx * 0.08,
                      ease: "easeInOut",
                    }}
                    className="w-0.5 h-3.5 rounded-full bg-rose-400 origin-center"
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoiceDictation}
            title={isListening ? "Sesle Yazmayı Durdur" : "Ses İle Yaz (Türkçe STT & Canlı Ses Dalgası)"}
            className={`size-9 rounded-xl transition-all ${
              isListening
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse ring-2 ring-rose-400/50"
                : "text-neutral-400 hover:text-purple-300 hover:bg-white/5"
            }`}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !attachedImagePreview) || isLoading}
            className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition-all disabled:opacity-40"
          >
            {isLoading ? (
              <Sparkles className="size-4 animate-spin text-purple-200" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="hidden sm:block max-w-4xl mx-auto mt-2 text-center text-[10px] text-neutral-500">
        Kael-AI — Derin RPG Simülasyonu, LaTeX Matematik & Çoklu AI Sohbet Platformu ✨
      </div>
    </div>
  );
}
