"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Shield,
  Coins,
  MapPin,
  Backpack,
  Clapperboard,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  FileText,
  Loader2,
  Sparkles,
  Palette,
  Dices,
  Camera,
  Network,
  Globe,
  Mic,
  MicOff,
  Gift,
  Send,
  Plus,
  Menu,
  X,
} from "lucide-react";
import {
  EMOTION_MAP,
  getAffectionStage,
  ROOM_SCENE_THEMES,
  ambientAudio,
  openPrintableA4ExamPdf,
  type EmotionKey,
  type RpgHudState,
  type RoomSceneTheme,
} from "@/lib/rpg/rpg-engine";
import {
  RPG_SKILLS,
  rollD20SkillCheck,
  applyRollToHudState,
  generateAutonomousWorldEvent,
  type SkillStatKey,
  type D20RollResult,
  type AutonomousWorldEvent,
} from "@/lib/rpg/world-dice-mindmap-engine";
import {
  CHARACTER_VOICES,
  cleanTextForSpeech,
  speakWithNeuralVoice,
  stopNeuralVoice,
} from "@/lib/voice/voices";

interface RpgSimulationBarProps {
  characterName: string;
  characterAvatar?: string | null;
  characterType?: string;
  voiceId?: string;
  onSelectVoiceId?: (voiceId: string) => void;
  externalVoiceCallOpen?: boolean;
  onChangeVoiceCallOpen?: (open: boolean) => void;
  isAiGenerating?: boolean;
  emotion: EmotionKey;
  affectionScore: number;
  lastAffectionDelta: number;
  hudState: RpgHudState;
  onUpdateHudState?: (nextHud: RpgHudState) => void;
  onAdjustAffection?: (delta: number) => void;
  authorsNote: string;
  onChangeAuthorsNote: (val: string) => void;
  activeSceneTheme: RoomSceneTheme;
  onSelectSceneTheme: (theme: RoomSceneTheme) => void;
  onTriggerVoiceCallSpeak?: () => void;
  onSendActionToChat?: (messageText: string, snapshotUrl?: string) => void;
  onOpenMindMap?: () => void;
  lastAssistantMessageText?: string;
}

export function RpgSimulationBar({
  characterName,
  characterAvatar,
  characterType = "realistic",
  voiceId = "anime-girl-yuki",
  onSelectVoiceId,
  externalVoiceCallOpen = false,
  onChangeVoiceCallOpen,
  isAiGenerating = false,
  emotion,
  affectionScore,
  lastAffectionDelta,
  hudState,
  onUpdateHudState,
  onAdjustAffection,
  authorsNote,
  onChangeAuthorsNote,
  activeSceneTheme,
  onSelectSceneTheme,
  onTriggerVoiceCallSpeak,
  onSendActionToChat,
  onOpenMindMap,
  lastAssistantMessageText,
}: RpgSimulationBarProps) {
  const [showHudPanel, setShowHudPanel] = useState(false);
  const [showDicePanel, setShowDicePanel] = useState(false);
  const [showDirectorPanel, setShowDirectorPanel] = useState(false);
  const [showScenePanel, setShowScenePanel] = useState(false);
  const [showWorldEventPanel, setShowWorldEventPanel] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [internalVoiceCallOpen, setInternalVoiceCallOpen] = useState(false);
  const isVoiceCallOpen = externalVoiceCallOpen || internalVoiceCallOpen;

  const setVoiceCallOpen = (open: boolean) => {
    setInternalVoiceCallOpen(open);
    onChangeVoiceCallOpen?.(open);
    if (!open) {
      stopNeuralVoice();
      stopCallRecording(false);
    }
  };

  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examTopicInput, setExamTopicInput] = useState("Türev, İntegral ve Fonksiyonlar");
  const [showExamModal, setShowExamModal] = useState(false);

  // D20 Skill Check State
  const [selectedSkill, setSelectedSkill] = useState<SkillStatKey>("INT");
  const [diceActionText, setDiceActionText] = useState("");
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [lastRollResult, setLastRollResult] = useState<D20RollResult | null>(null);

  // Inventory Custom Item Add
  const [newItemName, setNewItemName] = useState("");

  // Scene Snapshot Generator State
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);

  // Autonomous World Event State
  const [activeWorldEvent, setActiveWorldEvent] = useState<AutonomousWorldEvent | null>(null);

  // Live Voice Call 2.0 State
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallMicListening, setIsCallMicListening] = useState(false);
  const [isCallSpeaking, setIsCallSpeaking] = useState(false);
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [callSubtitleText, setCallSubtitleText] = useState("");
  const [callTextInput, setCallTextInput] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRecognitionRef = useRef<any>(null);
  const callMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const callMediaStreamRef = useRef<MediaStream | null>(null);
  const callAudioChunksRef = useRef<Blob[]>([]);
  const callInterimTextRef = useRef<string>("");
  const prevAiGeneratingRef = useRef<boolean>(false);
  const lastSpokenAssistantTextRef = useRef<string>("");

  const emotionMeta = EMOTION_MAP[emotion] || EMOTION_MAP.neutral;
  const affectionStage = getAffectionStage(affectionScore);

  const handleSpeakTTS = async (textToSpeak?: string) => {
    const raw =
      textToSpeak ||
      lastAssistantMessageText ||
      `Alo? Merhaba, ben ${characterName}. Seni dinliyorum, konuşabilirsin.`;
    const clean = cleanTextForSpeech(raw, false);
    if (!clean) return;
    lastSpokenAssistantTextRef.current = raw;
    setCallSubtitleText(`${characterName}: "${clean}"`);
    setIsCallSpeaking(true);
    await speakWithNeuralVoice({
      text: clean,
      voiceId,
      onStart: () => setIsCallSpeaking(true),
      onEnd: () => setIsCallSpeaking(false),
      onError: () => setIsCallSpeaking(false),
    });
  };

  // Telefon araması açıldığında karakter ilk selamı seslendirsin
  useEffect(() => {
    if (!isVoiceCallOpen) {
      setCallSeconds(0);
      setIsCallMicListening(false);
      setIsCallSpeaking(false);
      return;
    }
    handleSpeakTTS(
      lastAssistantMessageText ||
        `Alo? Merhaba, ben ${characterName}. Seni duyabiliyorum, konuşabilirsin!`
    );
    const timer = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceCallOpen]);

  // Yapay zeka yanıt üretmeyi bitirdiğinde telefon araması açıksa yeni yanıtı OTOMATİK SESLENDİR!
  useEffect(() => {
    const wasGenerating = prevAiGeneratingRef.current;
    prevAiGeneratingRef.current = isAiGenerating;

    if (
      isVoiceCallOpen &&
      wasGenerating &&
      !isAiGenerating &&
      lastAssistantMessageText &&
      lastAssistantMessageText !== lastSpokenAssistantTextRef.current
    ) {
      handleSpeakTTS(lastAssistantMessageText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiGenerating, lastAssistantMessageText, isVoiceCallOpen]);

  const formatCallTime = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const rem = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${rem}`;
  };

  const closeAllDrawers = () => {
    setShowHudPanel(false);
    setShowDicePanel(false);
    setShowDirectorPanel(false);
    setShowScenePanel(false);
    setShowWorldEventPanel(false);
  };

  const handleToggleAmbientAudio = (themeToPlay = activeSceneTheme) => {
    if (isAudioPlaying) {
      ambientAudio.stop();
      setIsAudioPlaying(false);
    } else {
      const sound = themeToPlay.soundType === "none" ? "rain" : themeToPlay.soundType;
      ambientAudio.start(sound, 0.25);
      setIsAudioPlaying(true);
    }
  };

  const handleSelectTheme = (theme: RoomSceneTheme) => {
    onSelectSceneTheme(theme);
    if (theme.soundType !== "none") {
      ambientAudio.start(theme.soundType, 0.25);
      setIsAudioPlaying(true);
    } else {
      ambientAudio.stop();
      setIsAudioPlaying(false);
    }
  };

  const stopCallRecording = (shouldSend = true) => {
    if (callRecognitionRef.current) {
      try {
        callRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      callRecognitionRef.current = null;
    }

    if (callMediaRecorderRef.current && callMediaRecorderRef.current.state !== "inactive") {
      try {
        if (!shouldSend) {
          callAudioChunksRef.current = [];
        }
        callMediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      callMediaRecorderRef.current = null;
    } else if (callMediaStreamRef.current) {
      callMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      callMediaStreamRef.current = null;
    }

    setIsCallMicListening(false);
  };

  // Telefon Görüşmesinde Gerçek Mikrofon + Groq Whisper STT
  const handleToggleCallMic = async () => {
    if (typeof window === "undefined") return;

    // Eğer zaten dinliyorsa -> Kaydı bitir ve konuştuğunu gönder!
    if (isCallMicListening) {
      stopCallRecording(true);
      return;
    }

    // Karakter konuşuyorsa susturup kullanıcıyı dinlemeye başla
    stopNeuralVoice();
    setIsCallSpeaking(false);
    callAudioChunksRef.current = [];
    callInterimTextRef.current = "";
    setCallSubtitleText("🎙️ Seni dinliyorum, konuşabilirsin... (Bitince tekrar bas)");
    setIsCallMicListening(true);

    // 1. Anlık altyazı önizlemesi için tarayıcı SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (typeof SpeechRec === "function") {
      try {
        const rec = new SpeechRec();
        rec.lang = "tr-TR";
        rec.continuous = true;
        rec.interimResults = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text.trim()) {
            callInterimTextRef.current = text.trim();
            setCallSubtitleText(`🎙️ Sen: "${text.trim()}"`);
          }
        };
        rec.start();
        callRecognitionRef.current = rec;
      } catch {
        // ignore
      }
    }

    // 2. Gerçek Mikrofon + Groq Whisper-Large-V3-Turbo STT
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        callMediaStreamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        callMediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            callAudioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = callAudioChunksRef.current;
          callAudioChunksRef.current = [];

          if (callMediaStreamRef.current) {
            callMediaStreamRef.current.getTracks().forEach((t) => t.stop());
            callMediaStreamRef.current = null;
          }

          let finalTranscript = callInterimTextRef.current.trim();

          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            if (blob.size > 400) {
              setIsTranscribingMic(true);
              try {
                const fd = new FormData();
                fd.append("file", blob, "call.webm");
                const res = await fetch("/api/voice/stt", {
                  method: "POST",
                  body: fd,
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.text && String(data.text).trim().length > 1) {
                    finalTranscript = String(data.text).trim();
                  }
                }
              } catch {
                // fallback to interim
              } finally {
                setIsTranscribingMic(false);
              }
            }
          }

          if (finalTranscript && onSendActionToChat) {
            setCallSubtitleText(`Sen: "${finalTranscript}" — ${characterName} düşünüyor...`);
            onSendActionToChat(finalTranscript);
          } else {
            setCallSubtitleText("Ses algılanamadı. Tekrar konuşabilir veya aşağıdan yazabilirsin.");
          }
        };

        recorder.start();
      } catch {
        setIsCallMicListening(false);
        setCallSubtitleText("⚠️ Mikrofon izni alınamadı. Aşağıdaki kutudan yazarak konuşabilirsin!");
      }
    }
  };

  const handleSendCallText = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = callTextInput.trim();
    if (!trimmed || !onSendActionToChat || isAiGenerating) return;
    stopNeuralVoice();
    setIsCallSpeaking(false);
    setCallSubtitleText(`Sen: "${trimmed}" — ${characterName} yanıtlıyor...`);
    setCallTextInput("");
    onSendActionToChat(trimmed);
  };

  // 1. Roll D20 Skill Check
  const handleRollD20 = () => {
    setIsRollingDice(true);
    setTimeout(() => {
      const res = rollD20SkillCheck(selectedSkill, diceActionText, 12);
      setLastRollResult(res);
      setIsRollingDice(false);
      if (onUpdateHudState) {
        onUpdateHudState(applyRollToHudState(hudState, res));
      }
    }, 550);
  };

  // 2. Generate In-Chat Scene Snapshot (Anlık Selfie / Sahne Çizdir)
  const handleGenerateSceneSnapshot = async () => {
    if (isGeneratingSnapshot) return;
    setIsGeneratingSnapshot(true);

    try {
      const recentContext = (lastAssistantMessageText || "Sinematik rol yapma sahnesi")
        .replace(/\*[^*]+\*/g, "")
        .slice(0, 140);

      const res = await fetch("/api/forge/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: characterName,
          characterType,
          customPrompt: `${characterName}, emotion: ${emotionMeta.label}, scene location: ${activeSceneTheme.name} (${hudState.location}), dramatic cinematic roleplay snapshot, ${recentContext}`,
          category: "general",
        }),
      });
      const data = await res.json();
      const imageUrl = data?.avatarUrl || characterAvatar;
      if (imageUrl && onSendActionToChat) {
        onSendActionToChat(
          `*📸 [${activeSceneTheme.name} — Anlık Sahne & Karakter İllüstrasyonu Çizildi]*`,
          imageUrl
        );
      }
    } catch {
      if (characterAvatar && onSendActionToChat) {
        onSendActionToChat(
          `*📸 [${activeSceneTheme.name} — Anlık Sahne Kare Yakalandı]*`,
          characterAvatar
        );
      }
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  // 3. Trigger Autonomous World Event
  const handleTriggerWorldTick = () => {
    const evt = generateAutonomousWorldEvent(characterName, hudState.location, affectionScore);
    setActiveWorldEvent(evt);
    closeAllDrawers();
    setShowWorldEventPanel(true);
    if (onAdjustAffection && evt.affectionImpact) {
      onAdjustAffection(evt.affectionImpact);
    }
  };

  const handleGenerateExamPdf = async () => {
    setIsGeneratingExam(true);
    try {
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: examTopicInput,
          difficulty: "AYT / Üniversiteye Hazırlık",
        }),
      });
      const data = await res.json();
      if (data?.exam) {
        openPrintableA4ExamPdf(data.exam);
        setShowExamModal(false);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <div className="relative z-20 border-b border-white/10 bg-neutral-950/85 backdrop-blur-xl px-2.5 sm:px-5 py-1.5 sm:py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {/* LEFT: Dynamic Emotion Sprite Badge + 5-Stage Affection Meter */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Dynamic Emotion Sprite Avatar & Status */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${emotionMeta.badgeClass}`}
            title={`Dinamik Duygu Spriteları: ${emotionMeta.label}`}
          >
            <div className="relative">
              {characterAvatar ? (
                <img
                  src={characterAvatar}
                  alt={characterName}
                  style={{ filter: emotionMeta.filterCss }}
                  className={`size-5 sm:size-6 rounded-full object-cover ring-2 transition-all ${emotionMeta.ringColor}`}
                />
              ) : (
                <span className="text-xs sm:text-sm">{emotionMeta.emoji}</span>
              )}
              <span className="absolute -bottom-1 -right-1 text-[10px] sm:text-[11px]">
                {emotionMeta.emoji}
              </span>
            </div>
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">Duygu: </span>
              {emotionMeta.label.split("/")[0].trim()}
            </span>
          </div>

          {/* 2. Affection / Relationship Meter (0-100) */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-semibold shrink-0 ${affectionStage.colorClass}`}
            title={`İlişki Kademesi (${affectionStage.rangeLabel}): ${affectionStage.promptInstruction}`}
          >
            <Heart className="size-3 sm:size-3.5 fill-current shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">{affectionStage.title}</span>
              <span className="sm:hidden">{affectionStage.title.split("/")[0].trim()}</span>
            </span>
            <div className="w-10 sm:w-14 h-1.5 sm:h-2 rounded-full bg-black/50 overflow-hidden border border-white/10 shrink-0">
              <div
                className={`h-full bg-gradient-to-r ${affectionStage.barGradient} transition-all duration-500`}
                style={{ width: `${Math.max(4, Math.min(100, affectionScore))}%` }}
              />
            </div>
            <span className="font-mono text-[10px] sm:text-[11px] shrink-0">{affectionScore}/100</span>
            {lastAffectionDelta !== 0 && (
              <span
                className={`px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
                  lastAffectionDelta > 0
                    ? "bg-emerald-500/25 text-emerald-200"
                    : "bg-red-500/25 text-red-200"
                }`}
              >
                {lastAffectionDelta > 0 ? `+${lastAffectionDelta}` : lastAffectionDelta}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Clean Single-Row Quick Controls + 3-Line (☰) RPG Tools Menu */}
        <div className="relative flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Action 1: D20 Zar */}
          <button
            type="button"
            onClick={() => {
              const next = !showDicePanel;
              closeAllDrawers();
              setIsToolsMenuOpen(false);
              setShowDicePanel(next);
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-[11px] font-bold border whitespace-nowrap transition cursor-pointer ${
              showDicePanel
                ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-md"
                : "bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
            }`}
            title="D20 RPG Yetenek Zarı At & Hamle Yap"
          >
            <Dices className="size-3.5 text-amber-400" />
            <span className="hidden sm:inline">🎲 D20 Zar</span>
          </button>

          {/* Quick Action 2: Anı Resmet */}
          <button
            type="button"
            disabled={isGeneratingSnapshot}
            onClick={handleGenerateSceneSnapshot}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-[11px] font-bold bg-pink-600/20 hover:bg-pink-600/35 border border-pink-500/40 text-pink-200 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
            title="Son konuşulan sahneyi canlı resmet!"
          >
            {isGeneratingSnapshot ? (
              <Loader2 className="size-3.5 animate-spin text-pink-300" />
            ) : (
              <Camera className="size-3.5 text-pink-400" />
            )}
            <span className="hidden sm:inline">{isGeneratingSnapshot ? "Çiziliyor..." : "📸 Anı Resmet"}</span>
          </button>

          {/* 3-Line (☰) RPG & Araçlar Menu Button */}
          <button
            type="button"
            onClick={() => setIsToolsMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold border whitespace-nowrap transition cursor-pointer ${
              isToolsMenuOpen
                ? "bg-purple-600 border-purple-400 text-white shadow-lg"
                : "bg-neutral-900 hover:bg-neutral-800 border-white/15 text-purple-200"
            }`}
            title="Tüm RPG, Ses, Zihin Haritası ve Sahne Araçlarını Aç"
          >
            {isToolsMenuOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
            <span className="hidden sm:inline">RPG & </span>
            <span>Araçlar</span>
          </button>

          {/* Right-Aligned 3-Line Popover Drawer */}
          <AnimatePresence>
            {isToolsMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-72 rounded-2xl border border-purple-500/40 bg-neutral-900/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50 space-y-1"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-purple-300 border-b border-white/10 mb-1 flex items-center justify-between">
                  <span>Sahne & RPG Araç Kutusu</span>
                  <span>
                    {hudState.hp} HP • {hudState.gold} 🪙
                  </span>
                </div>

                {/* 1. Envanter & Statlar */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !showHudPanel;
                    closeAllDrawers();
                    setShowHudPanel(next);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-amber-500/20 text-xs font-semibold text-amber-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="size-4 text-amber-400" />
                    <span>🎒 Envanter & Hediye Çantası</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-300">
                    {hudState.inventory.length} Eşya
                  </span>
                </button>

                {/* 2. Zihin Haritası & Kanıt Panosu */}
                {onOpenMindMap && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenMindMap();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-purple-500/25 text-xs font-semibold text-purple-200 transition cursor-pointer text-left"
                  >
                    <Network className="size-4 text-purple-400 shrink-0" />
                    <span>🧠 Zihin Haritası & Kanıt Panosu</span>
                  </button>
                )}

                {/* 3. Dünya Olayı & Dedikodu */}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    handleTriggerWorldTick();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-teal-500/25 text-xs font-semibold text-teal-200 transition cursor-pointer text-left"
                >
                  <Globe className="size-4 text-teal-400 shrink-0" />
                  <span>🌍 Arka Plan Dünya Olayı Üret</span>
                </button>

                {/* 4. Yazar Notu (Sahne Direktifi) */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !showDirectorPanel;
                    closeAllDrawers();
                    setShowDirectorPanel(next);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-purple-500/25 text-xs font-semibold text-neutral-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clapperboard className="size-4 text-purple-400" />
                    <span>🎬 Yazar Notu (Sahne Yönetmeni)</span>
                  </span>
                  {authorsNote.trim() && (
                    <span className="text-[10px] text-emerald-400 font-bold">Aktif</span>
                  )}
                </button>

                {/* 5. Sahne Arka Planı & Ambiyans Sesi */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showScenePanel;
                      closeAllDrawers();
                      setShowScenePanel(next);
                      setIsToolsMenuOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-500/25 text-xs font-semibold text-cyan-200 transition cursor-pointer text-left"
                  >
                    <Palette className="size-4 text-cyan-400 shrink-0" />
                    <span>{activeSceneTheme.emoji} Sahne & Ortam Değiştir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAmbientAudio()}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      isAudioPlaying
                        ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-300"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                    title={isAudioPlaying ? "Ambiyans Sesini Kapat" : "Ambiyans Sesini Aç"}
                  >
                    {isAudioPlaying ? (
                      <Volume2 className="size-4" />
                    ) : (
                      <VolumeX className="size-4" />
                    )}
                  </button>
                </div>

                {/* 6. Canlı Sesli Telefon Görüşmesi */}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setVoiceCallOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-500/25 text-xs font-semibold text-emerald-200 transition cursor-pointer text-left"
                >
                  <PhoneCall className="size-4 text-emerald-400 shrink-0" />
                  <span>📞 Canlı Sesli Telefon Görüşmesi</span>
                </button>

                {/* 7. A4 Optik Sınav PDF'i */}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setShowExamModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-indigo-500/25 text-xs font-semibold text-indigo-200 transition cursor-pointer text-left"
                >
                  <FileText className="size-4 text-indigo-400 shrink-0" />
                  <span>📄 A4 Optik Sınav PDF&apos;i Oluştur</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* EXPANDABLE DRAWER 0: D20 SKILL CHECK & DICE ROLLER ENGINE */}
      <AnimatePresence>
        {showDicePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto mt-2.5 pt-2.5 border-t border-white/10 overflow-hidden"
          >
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-900/90 to-purple-950/30 border border-amber-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-amber-200 flex items-center gap-2">
                  <Dices className="size-4 text-amber-400" />
                  <span>🎲 Canlı D20 RPG Yetenek Zarı & Ganimet (Loot) Motoru</span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Zorluk Derecesi (DC): <strong className="text-amber-300">12</strong> • Doğal 20 atarsan nadir eşya & +30 🪙 kazanırsın!
                </span>
              </div>

              {/* 6 Skill Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {RPG_SKILLS.map((sk) => {
                  const active = selectedSkill === sk.key;
                  return (
                    <button
                      key={sk.key}
                      type="button"
                      onClick={() => {
                        setSelectedSkill(sk.key);
                        if (!diceActionText) setDiceActionText(sk.exampleAction);
                      }}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? "border-amber-400 bg-amber-500/20 text-white shadow-md"
                          : "border-white/10 bg-black/40 text-neutral-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>
                          {sk.emoji} {sk.key}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300">+{sk.bonus}</span>
                      </div>
                      <div className="text-[10px] text-neutral-300 truncate mt-0.5">{sk.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Action Input + Roll Trigger */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={diceActionText}
                  onChange={(e) => setDiceActionText(e.target.value)}
                  placeholder="Denemek istediğin hamleyi yaz (Örn: Kapıyı omuzlayıp kırıyorum / Gözlerinin içine bakıp ikna ediyorum)..."
                  className="flex-1 w-full bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500"
                />
                <button
                  type="button"
                  disabled={isRollingDice}
                  onClick={handleRollD20}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shrink-0 cursor-pointer"
                >
                  <motion.span
                    animate={isRollingDice ? { rotate: [0, 180, 360] } : { rotate: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    🎲
                  </motion.span>
                  <span>{isRollingDice ? "Zar Dönüyor..." : "D20 Zar At!"}</span>
                </button>
              </div>

              {/* Roll Result Banner + Send to Chat */}
              {lastRollResult && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border ${lastRollResult.tierColor}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-black/50 border border-white/20 flex flex-col items-center justify-center font-mono">
                      <span className="text-sm font-black">{lastRollResult.rawRoll}</span>
                      <span className="text-[9px] opacity-75">+{lastRollResult.modifier}</span>
                    </div>
                    <div className="text-xs">
                      <div className="font-extrabold flex items-center gap-2">
                        <span>{lastRollResult.tierLabel}</span>
                        <span className="font-mono text-[11px] opacity-90">
                          (Toplam: {lastRollResult.total} vs DC {lastRollResult.difficultyClass})
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-0.5">{lastRollResult.actionText}</p>
                      {lastRollResult.lootReward && (
                        <p className="text-[11px] text-amber-200 font-semibold mt-0.5">
                          🎁 Ganimet Kazanıldı: {lastRollResult.lootReward.icon}{" "}
                          {lastRollResult.lootReward.name} envantere eklendi!
                        </p>
                      )}
                    </div>
                  </div>

                  {onSendActionToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onSendActionToChat(lastRollResult.narrativeInjection);
                        setShowDicePanel(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-xs flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>Zarı Sohbete Gönder & Hamleyi Oyna</span>
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDABLE DRAWER 1: INTERACTIVE RPG STATUS & INVENTORY HUD */}
      <AnimatePresence>
        {showHudPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto mt-2 pt-2 border-t border-white/10 overflow-hidden space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between">
                <span className="text-red-300 font-semibold flex items-center gap-1.5">
                  <Heart className="size-3.5 text-red-400" /> Can (HP):
                </span>
                <span className="font-mono font-bold text-white">
                  {hudState.hp} / {hudState.maxHp}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                  <Coins className="size-3.5 text-amber-400" /> Altın / Kredi:
                </span>
                <span className="font-mono font-bold text-amber-200">{hudState.gold} 🪙</span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                <span className="text-blue-300 font-semibold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-blue-400" /> Konum:
                </span>
                <span className="truncate font-medium text-white max-w-[160px]">
                  {hudState.location}
                </span>
              </div>
            </div>

            {/* Interactive Inventory Items (Use or Gift to Character!) */}
            <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Backpack className="size-3.5 text-purple-400" />
                  <span>Envanter Çantası (Eşyayı Kullan veya Karaktere Hediye Et):</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Yeni eşya ekle..."
                    className="bg-neutral-950 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newItemName.trim() || !onUpdateHudState) return;
                      onUpdateHudState({
                        ...hudState,
                        inventory: [
                          ...hudState.inventory,
                          { name: newItemName.trim(), icon: "🎒", qty: 1 },
                        ],
                      });
                      setNewItemName("");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="size-3" /> Ekle
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hudState.inventory.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-purple-100"
                  >
                    <span>
                      {item.icon} <strong>{item.name}</strong> x{item.qty}
                    </span>
                    {onSendActionToChat && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onSendActionToChat(
                              `*Envanter çantamdan "${item.icon} ${item.name}" eşyasını çıkarıp kullanırım / gösteririm.*`
                            );
                            setShowHudPanel(false);
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600 text-[10px] text-purple-200 hover:text-white transition cursor-pointer"
                          title="Sohbette Kullan / Göster"
                        >
                          Kullan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onAdjustAffection) onAdjustAffection(5);
                            onSendActionToChat(
                              `*Çantamdan "${item.icon} ${item.name}" çıkarıp gülümseyerek ${characterName.split(" ")[0]}'e hediye ederim.* "Bunu senin için saklamıştım."`
                            );
                            setShowHudPanel(false);
                          }}
                          className="px-1.5 py-0.5 rounded bg-pink-600/30 hover:bg-pink-600 text-[10px] text-pink-200 hover:text-white flex items-center gap-0.5 transition cursor-pointer"
                          title="Karaktere Hediye Et (+5 Yakınlık)"
                        >
                          <Gift className="size-2.5" /> Hediye Et
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDABLE DRAWER 1.5: AUTONOMOUS WORLD EVENT & GOSSIP BANNER */}
      <AnimatePresence>
        {showWorldEventPanel && activeWorldEvent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto mt-2 pt-2 border-t border-white/10 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/50 via-neutral-900 to-emerald-950/40 border border-teal-500/40">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 font-extrabold text-teal-200">
                  <span>{activeWorldEvent.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                    Saat {activeWorldEvent.timestamp} • +{activeWorldEvent.affectionImpact} Yakınlık
                  </span>
                </div>
                <p className="text-neutral-200 text-[11px]">{activeWorldEvent.summary}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTriggerWorldTick}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-teal-200 cursor-pointer"
                >
                  🔄 Başka Olay
                </button>
                {onSendActionToChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onSendActionToChat(activeWorldEvent.promptHook);
                      setShowWorldEventPanel(false);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    <span>🎬 Bu Olaydan Sahneye Gir!</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDABLE DRAWER 2: AUTHOR'S NOTE / DIRECTOR MODE */}
      <AnimatePresence>
        {showDirectorPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto mt-2 pt-2 border-t border-white/10 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-purple-950/25 border border-purple-500/30 p-2.5 rounded-xl">
              <div className="text-xs text-purple-200 font-semibold shrink-0 flex items-center gap-1.5">
                <Clapperboard className="size-4 text-purple-400" />
                <span>Yazar Notu (Depth-2 Sahne Direktifi):</span>
              </div>
              <input
                type="text"
                value={authorsNote}
                onChange={(e) => onChangeAuthorsNote(e.target.value)}
                placeholder="Örn: Aniden dışarıda şimşek çakar ve gizemli bir haberci kapıyı çalar; karakter gerilimi hissetsin..."
                className="flex-1 w-full bg-neutral-900/90 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-400"
              />
              {authorsNote && (
                <button
                  type="button"
                  onClick={() => onChangeAuthorsNote("")}
                  className="text-[11px] text-neutral-400 hover:text-white px-2 py-1"
                >
                  Temizle
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDABLE DRAWER 3: ROOM SCENE BACKGROUND & AMBIENT SOUND */}
      <AnimatePresence>
        {showScenePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto mt-2 pt-2 border-t border-white/10 overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ROOM_SCENE_THEMES.map((theme) => {
                const isSelected = activeSceneTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 text-white shadow-md"
                        : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>
                        {theme.emoji} {theme.name}
                      </span>
                      {isSelected && <Sparkles className="size-3 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                      {theme.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: LIVE VOICE CALL 2.0 (FULL INTERACTIVE PHONE CALL WITH STT + NEURAL TTS + 14 VOICES) */}
      <AnimatePresence>
        {isVoiceCallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-purple-500/40 bg-gradient-to-b from-neutral-900 via-purple-950/40 to-neutral-950 p-6 text-center shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  {isCallMicListening
                    ? "🎙️ Seni Dinliyor..."
                    : isTranscribingMic || isAiGenerating
                      ? "💭 Yanıt Hazırlanıyor..."
                      : isCallSpeaking
                        ? "🔊 Karakter Konuşuyor..."
                        : "📞 Canlı Sesli Görüşme"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200">
                  ⏱️ {formatCallTime(callSeconds)}
                </span>
              </div>

              <div className="relative mx-auto size-24">
                <span
                  className={`animate-ping absolute inset-0 rounded-full ${
                    isCallSpeaking
                      ? "bg-emerald-500/40"
                      : isCallMicListening
                        ? "bg-rose-500/40"
                        : "bg-purple-500/25"
                  }`}
                />
                <img
                  src={
                    characterAvatar ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                  }
                  alt={characterName}
                  style={{ filter: emotionMeta.filterCss }}
                  className={`relative size-24 rounded-full object-cover border-2 shadow-2xl mx-auto ${
                    isCallSpeaking
                      ? "border-emerald-400 ring-4 ring-emerald-500/30"
                      : isCallMicListening
                        ? "border-rose-400 ring-4 ring-rose-500/30"
                        : "border-purple-400"
                  }`}
                />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-white">{characterName}</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  {emotionMeta.emoji} {emotionMeta.label} • Yakınlık: {affectionScore}/100
                </p>
              </div>

              {/* 14 Ses Seçici (Arama Sırasında Anında Ses Tonu Değiştir) */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] text-neutral-400 shrink-0">Ses Tonu:</span>
                <select
                  value={voiceId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    onSelectVoiceId?.(nextId);
                    const found = CHARACTER_VOICES.find((v) => v.id === nextId);
                    if (found) {
                      speakWithNeuralVoice({
                        text: found.sampleText,
                        voiceId: found.id,
                        onStart: () => setIsCallSpeaking(true),
                        onEnd: () => setIsCallSpeaking(false),
                      });
                    }
                  }}
                  className="bg-neutral-950/90 border border-pink-500/40 rounded-xl px-2.5 py-1.5 text-xs text-pink-200 font-semibold max-w-[260px] focus:outline-none focus:border-pink-400"
                >
                  <optgroup label="👩 Kadın & Anime Kız Sesleri">
                    {CHARACTER_VOICES.filter((v) => v.gender === "female").map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="👨 Erkek & Anlatıcı Sesleri">
                    {CHARACTER_VOICES.filter((v) => v.gender === "male").map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Live Subtitles Box */}
              <div className="p-3 rounded-2xl bg-black/50 border border-white/10 text-xs text-purple-100 min-h-[60px] max-h-28 overflow-y-auto flex items-center justify-center italic leading-relaxed">
                {callSubtitleText ||
                  cleanTextForSpeech(lastAssistantMessageText || "") ||
                  `"Alo? Seni dinliyorum, konuşabilirsin..."`}
              </div>

              {/* Animated Voice Call Waveform Bars */}
              <div className="flex items-center justify-center gap-1.5 h-10 py-1">
                {[0.35, 0.85, 0.55, 1.0, 0.65, 0.95, 0.4, 0.9, 0.75, 1.0, 0.5, 0.8, 0.4].map(
                  (peak, idx) => (
                    <motion.span
                      key={idx}
                      animate={{
                        scaleY:
                          isCallMicListening || isCallSpeaking || isAiGenerating
                            ? [0.2, peak, 0.3, peak * 0.9, 0.2]
                            : 0.25,
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.65 + (idx % 4) * 0.12,
                        ease: "easeInOut",
                      }}
                      className={`w-1.5 h-9 rounded-full ${
                        isCallMicListening
                          ? "bg-gradient-to-t from-red-500 via-rose-400 to-amber-300"
                          : isCallSpeaking
                            ? "bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300"
                            : "bg-gradient-to-t from-purple-500 via-pink-400 to-indigo-300"
                      }`}
                    />
                  )
                )}
              </div>

              {/* Mikrofonsuz veya hızlı yazarak konuşmak isteyenler için mini kutu */}
              <form onSubmit={handleSendCallText} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={callTextInput}
                  onChange={(e) => setCallTextInput(e.target.value)}
                  disabled={isAiGenerating}
                  placeholder="Mikrofonla konuş veya buraya yazıp Enter'a bas..."
                  className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={!callTextInput.trim() || isAiGenerating}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="size-3.5" />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTranscribingMic || isAiGenerating}
                  onClick={handleToggleCallMic}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50 ${
                    isCallMicListening
                      ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {isTranscribingMic ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Çevrildi...
                    </>
                  ) : isCallMicListening ? (
                    <>
                      <MicOff className="size-3.5" /> Konuşmayı Bitir & Gönder
                    </>
                  ) : (
                    <>
                      <Mic className="size-3.5" /> Mikrofonla Konuş (TR)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={() => {
                    if (isCallSpeaking) {
                      stopNeuralVoice();
                      setIsCallSpeaking(false);
                      return;
                    }
                    if (lastAssistantMessageText) {
                      handleSpeakTTS(lastAssistantMessageText);
                    } else if (onTriggerVoiceCallSpeak) {
                      onTriggerVoiceCallSpeak();
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isCallSpeaking ? "🔇 Sesi Durdur" : "🔊 Tekrar Seslendir"}
                </button>

                <button
                  type="button"
                  onClick={() => setVoiceCallOpen(false)}
                  className="px-3.5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <PhoneOff className="size-3.5" /> Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: A4 EXAM & OPTICAL SHEET PDF GENERATOR */}
      <AnimatePresence>
        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-indigo-500/40 bg-neutral-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileText className="size-4 text-indigo-400" />
                  <span>A4 Optik Formlu & LaTeX Deneme Sınavı (PDF) Üretici</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Kapat ✕
                </button>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                İstediğin ders ve konuyu yaz; sistem arka planda <strong>LaTeX formüllü</strong>,{" "}
                <strong>5 şıklı optik kodlama alanlı</strong> ve <strong>Sokratik çözümlü</strong> A4 sınav kağıdını hazırlayıp açsın!
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-indigo-200">
                  Sınav Konusu / Ünite:
                </label>
                <input
                  type="text"
                  value={examTopicInput}
                  onChange={(e) => setExamTopicInput(e.target.value)}
                  placeholder="Örn: Türev ve İntegral, Trigonometri, Newton Hareket Yasaları..."
                  className="w-full bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-neutral-300"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isGeneratingExam}
                  onClick={handleGenerateExamPdf}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  {isGeneratingExam ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>LaTeX Sorular & Optik Form Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="size-3.5" />
                      <span>🖨️ A4 Sınav PDF&apos;i Oluştur ve İndir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
