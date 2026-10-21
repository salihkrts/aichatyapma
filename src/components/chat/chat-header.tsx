"use client";

import { useState } from "react";
import {
  Volume2,
  VolumeX,
  Info,
  GitBranch,
  Sparkles,
  Heart,
  Bot,
  Brain,
  Plus,
  Trash2,
  RotateCcw,
  Lock,
  PhoneCall,
  Mic,
  Play,
  Square,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CHARACTER_VOICES,
  VOICE_FILTER_PRESETS,
  getVoiceDspSettings,
  saveVoiceDspSettings,
  speakWithNeuralVoice,
  stopNeuralVoice,
  type VoiceFilterId,
} from "@/lib/voice/voices";
import type { Character, Chat } from "@/types/database";

interface ChatHeaderProps {
  character: Character | null;
  activeChat: Chat | null;
  memories?: string[];
  affinityScore?: number;
  selectedVoiceId?: string;
  onSelectVoiceId?: (voiceId: string) => void;
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  onStartVoiceCall?: () => void;
  onAddMemory?: (fact: string) => void;
  onRemoveMemory?: (index: number) => void;
  onResetChat?: () => void;
  onForkCharacter?: () => void;
  onOpenBrainSettings?: () => void;
  onBack?: () => void;
  onOpenTimelines?: () => void;
}

function getAffinityInfo(score: number) {
  if (score >= 80)
    return { label: "Sırdaş & Çok Yakın", color: "text-pink-400 border-pink-500/30 bg-pink-500/10" };
  if (score >= 55)
    return { label: "Güvenilir Dost", color: "text-purple-300 border-purple-500/30 bg-purple-500/10" };
  if (score >= 30)
    return { label: "Samimi Tanıdık", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" };
  if (score >= 12)
    return { label: "Yeni Tanışıyor", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" };
  return { label: "Yabancı", color: "text-neutral-400 border-white/10 bg-white/5" };
}

export function ChatHeader({
  character,
  activeChat,
  memories = [],
  affinityScore = 10,
  selectedVoiceId = "anime-girl-yuki",
  onSelectVoiceId,
  autoSpeak = false,
  onToggleAutoSpeak,
  onStartVoiceCall,
  onAddMemory,
  onRemoveMemory,
  onResetChat,
  onOpenBrainSettings,
  onBack,
  onOpenTimelines,
}: ChatHeaderProps) {
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilterId>(
    () => getVoiceDspSettings().filterId
  );
  const [voiceSpeed, setVoiceSpeed] = useState<number>(
    () => getVoiceDspSettings().speedRate
  );
  const currentVoice =
    CHARACTER_VOICES.find((v) => v.id === selectedVoiceId) || CHARACTER_VOICES[0];

  if (!character) {
    return (
      <header className="h-16 border-b border-white/10 bg-neutral-950/60 backdrop-blur-xl flex items-center px-6">
        <span className="text-xs text-neutral-500 font-mono">
          Karakter kimliği yükleniyor...
        </span>
      </header>
    );
  }

  const isBranched = Boolean(activeChat?.parent_chat_id);
  const affinity = getAffinityInfo(affinityScore);

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim() || !onAddMemory) return;
    onAddMemory(newMemoryInput.trim());
    setNewMemoryInput("");
  };

  return (
    <header className="h-16 shrink-0 border-b border-white/10 bg-neutral-950/75 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 z-10">
      {/* Left: Persona identity & status */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="size-9 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer shrink-0"
            title="Keşfete Geri Dön"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        {onOpenTimelines && (
          <button
            type="button"
            onClick={onOpenTimelines}
            className="md:hidden size-9 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 flex items-center justify-center text-purple-300 transition cursor-pointer shrink-0"
            title="Geçmiş Sohbetler & Zaman Çizelgeleri"
          >
            <GitBranch className="size-4" />
          </button>
        )}
        <div className="relative shrink-0">
          <Avatar className="size-10 border border-white/15 shadow-md">
            <AvatarImage
              src={character.avatar_url || undefined}
              alt={character.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-neutral-900 text-purple-300 font-bold text-sm">
              <Bot className="size-5" />
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              {character.name}
            </h2>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 font-medium hidden sm:inline-flex items-center gap-1 ${affinity.color}`}
            >
              <Heart className="size-2.5 fill-current" />
              {affinity.label} (%{Math.min(100, affinityScore)})
            </Badge>

            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-pink-500/20 border border-amber-500/40 text-amber-200 hidden sm:inline-flex items-center gap-1 shadow-sm">
              <Sparkles className="size-2.5 text-amber-400 animate-pulse" />
              Kael 5.0
            </span>

            {isBranched && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono flex items-center gap-1"
              >
                <GitBranch className="size-2.5" />
                {activeChat?.branch_label || "Paralel Evren"}
              </Badge>
            )}
          </div>

          <p className="text-[11px] text-neutral-400 line-clamp-1 max-w-[240px] sm:max-w-md">
            {character.tagline || character.description || "Canlı Karakter Kimliği"}
          </p>
        </div>
      </div>

      {/* Right: Memory Bank, Reset, Brain Settings & Persona Lore Sheet */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Character Memory Sheet Trigger */}
        <Sheet>
          <SheetTrigger
            className="h-8 px-2.5 rounded-xl border border-purple-500/30 bg-purple-950/25 hover:bg-purple-950/50 text-purple-200 text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Karakter Hafızası ve Kimlik Detayları"
          >
            <Brain className="size-3.5 text-purple-400" />
            <span className="hidden md:inline font-medium text-[11px]">
              Hafıza ({memories.length})
            </span>
          </SheetTrigger>
          <SheetContent className="bg-neutral-900 border-white/10 text-white w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="size-14 border border-purple-500/40">
                  <AvatarImage src={character.avatar_url || undefined} />
                  <AvatarFallback>{character.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-lg font-bold text-white">
                    {character.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-neutral-400">
                    {character.tagline}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-5 space-y-6 text-xs text-neutral-300">
              {/* Relationship / Affinity Progress */}
              <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-200 flex items-center gap-1.5">
                    <Heart className="size-3.5 text-pink-400 fill-pink-400" />
                    İlişki & Güven Seviyesi
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${affinity.color}`}>
                    {affinity.label} • %{Math.min(100, affinityScore)}
                  </Badge>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, affinityScore))}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Sohbet ettikçe aranızdaki bağ güçlenir ve karakter gizli sırlarını sana daha çok açar.
                </p>
              </div>

              {/* Persistent Character Memory Bank */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Brain className="size-3.5 text-purple-400" />
                  Karakterin Senin Hakkında Hatırladıkları ({memories.length})
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Sohbet sırasında söylediklerin otomatik kaydedilir veya aşağıdan kendin bilgi ekleyebilirsin:
                </p>

                <form onSubmit={handleAddMemorySubmit} className="flex gap-1.5">
                  <Input
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="Örn: Adım Ahmet, polisiyeyi çok severim..."
                    className="h-8 bg-neutral-950 border-white/10 text-xs text-white rounded-lg"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shrink-0"
                  >
                    <Plus className="size-3.5 mr-1" /> Ekle
                  </Button>
                </form>

                {memories.length === 0 ? (
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-neutral-500 text-[11px] text-center">
                    Henüz kaydedilmiş özel bir anı yok. Sohbet ettikçe burası dolacak!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {memories.map((mem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] text-neutral-200"
                      >
                        <span className="leading-snug">• {mem}</span>
                        {onRemoveMemory && (
                          <button
                            type="button"
                            onClick={() => onRemoveMemory(idx)}
                            className="text-neutral-500 hover:text-red-400 transition shrink-0"
                            title="Hafızadan Sil"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Psychology sliders view */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-purple-400" /> Kişilik Matrisi
                </h4>
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Empati</span>
                    <span className="font-mono text-white">%{character.trait_empathy}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Mizah</span>
                    <span className="font-mono text-white">%{character.trait_humor}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Sertlik</span>
                    <span className="font-mono text-white">%{character.trait_aggression}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Yaratıcılık</span>
                    <span className="font-mono text-white">%{character.trait_creativity}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Resmiyet</span>
                    <span className="font-mono text-white">%{character.trait_formality}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">Sıcaklık</span>
                    <span className="font-mono text-white">%{character.trait_warmth}</span>
                  </div>
                </div>
              </div>

              {/* Backstory */}
              {character.backstory && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Karakter Hikayesi (Backstory)
                  </h4>
                  <p className="text-neutral-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    {character.backstory}
                  </p>
                </div>
              )}

              {/* Worldview */}
              {character.worldview && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Dünya Görüşü & Felsefesi
                  </h4>
                  <p className="text-neutral-300 leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    {character.worldview}
                  </p>
                </div>
              )}

              {/* Secrets (Unlocked at Affinity >= 40) */}
              {character.secrets && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-pink-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="size-3" /> Gizli Sırrı
                  </h4>
                  {affinityScore >= 35 ? (
                    <p className="text-pink-200/90 leading-relaxed bg-pink-950/20 p-3 rounded-lg border border-pink-500/20">
                      {character.secrets}
                    </p>
                  ) : (
                    <p className="text-neutral-500 italic bg-white/[0.02] p-3 rounded-lg border border-white/5">
                      🔒 Bu sırrı öğrenmek için karakterle biraz daha sohbet edip yakınlık seviyeni %35&apos;e çıkarman gerekiyor.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Canlı Sesli Telefon Görüşmesi Başlat */}
        {onStartVoiceCall && (
          <Button
            type="button"
            size="sm"
            onClick={onStartVoiceCall}
            className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer transition"
            title="Karakteri Telefonla Sesli Ara & Konuş"
          >
            <PhoneCall className="size-3.5 animate-pulse" />
            <span>Sesli Ara</span>
          </Button>
        )}

        {/* 14 Farklı Ses Seçici (Kadın / Anime / Erkek Neural Sesler) */}
        <Sheet>
          <SheetTrigger
            className="h-8 px-2.5 rounded-xl border border-pink-500/30 bg-pink-950/25 hover:bg-pink-950/50 text-pink-200 text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Karakterin Ses Tonunu Değiştir (14 Farklı Ses Seçeneği)"
          >
            <Mic className="size-3.5 text-pink-400" />
            <span className="hidden md:inline font-medium text-[11px]">
              Ses: {currentVoice.badge}
            </span>
          </SheetTrigger>
          <SheetContent className="bg-neutral-900 border-white/10 text-white w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base font-bold text-white flex items-center gap-2">
                <Volume2 className="size-4 text-pink-400" />
                <span>Karakter Ses Stüdyosu (14 Neural Ses)</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-neutral-400">
                {character.name} için istediğin kadın, anime kızı veya erkek ses tonunu seçip anında dinleyebilirsin.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Otomatik Seslendirme Anahtarı */}
              {onToggleAutoSpeak && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                  <div>
                    <div className="text-xs font-bold text-purple-200">
                      🔊 Mesajları Otomatik Seslendir
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Açık olduğunda karakterin yazdığı her yeni mesaj otomatik okunur.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoSpeak}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      autoSpeak
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {autoSpeak ? "Açık ✓" : "Kapalı"}
                  </button>
                </div>
              )}

              {/* Ses Efektleri & Akustik Filtreler (Telsiz, Telefon, Eko, Hız) */}
              <div className="p-3 rounded-xl bg-neutral-950/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    🎛️ Akustik Ses Efekti & Filtresi
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Hız: {voiceSpeed.toFixed(2)}x
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {VOICE_FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setVoiceFilter(preset.id);
                        saveVoiceDspSettings({
                          filterId: preset.id,
                          speedRate: voiceSpeed,
                        });
                      }}
                      title={preset.description}
                      className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        voiceFilter === preset.id
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                          : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Yavaş (0.85x)</span>
                    <span>Konuşma Hızı</span>
                    <span>Hızlı (1.30x)</span>
                  </div>
                  <input
                    type="range"
                    min={0.85}
                    max={1.3}
                    step={0.05}
                    value={voiceSpeed}
                    onChange={(e) => {
                      const nextSpeed = Number(e.target.value);
                      setVoiceSpeed(nextSpeed);
                      saveVoiceDspSettings({
                        filterId: voiceFilter,
                        speedRate: nextSpeed,
                      });
                    }}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Kadın & Anime Sesleri */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">
                  👩 Kadın & Anime Kız Sesleri (9 Seçenek)
                </h4>
                <div className="space-y-1.5">
                  {CHARACTER_VOICES.filter((v) => v.gender === "female").map((v) => {
                    const isSelected = v.id === currentVoice.id;
                    const isPrev = previewingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                          isSelected
                            ? "border-pink-500 bg-pink-950/35 text-white"
                            : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectVoiceId?.(v.id)}
                          className="flex-1 text-left cursor-pointer"
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>{v.name}</span>
                            {isSelected && <Check className="size-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            {v.description}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isPrev) {
                              stopNeuralVoice();
                              setPreviewingVoiceId(null);
                              return;
                            }
                            setPreviewingVoiceId(v.id);
                            speakWithNeuralVoice({
                              text: v.sampleText,
                              voiceId: v.id,
                              onEnd: () => setPreviewingVoiceId(null),
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-pink-600/40 text-[11px] font-semibold text-pink-200 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isPrev ? (
                            <>
                              <Square className="size-3 fill-current" /> Durdur
                            </>
                          ) : (
                            <>
                              <Play className="size-3 fill-current" /> Dinle
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Erkek Sesleri */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  👨 Erkek & Anlatıcı Sesleri (5 Seçenek)
                </h4>
                <div className="space-y-1.5">
                  {CHARACTER_VOICES.filter((v) => v.gender === "male").map((v) => {
                    const isSelected = v.id === currentVoice.id;
                    const isPrev = previewingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                          isSelected
                            ? "border-cyan-500 bg-cyan-950/35 text-white"
                            : "border-white/10 bg-white/[0.02] text-neutral-300 hover:border-white/25"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectVoiceId?.(v.id)}
                          className="flex-1 text-left cursor-pointer"
                        >
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>{v.name}</span>
                            {isSelected && <Check className="size-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            {v.description}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isPrev) {
                              stopNeuralVoice();
                              setPreviewingVoiceId(null);
                              return;
                            }
                            setPreviewingVoiceId(v.id);
                            speakWithNeuralVoice({
                              text: v.sampleText,
                              voiceId: v.id,
                              onEnd: () => setPreviewingVoiceId(null),
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-cyan-600/40 text-[11px] font-semibold text-cyan-200 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {isPrev ? (
                            <>
                              <Square className="size-3 fill-current" /> Durdur
                            </>
                          ) : (
                            <>
                              <Play className="size-3 fill-current" /> Dinle
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {onResetChat && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetChat}
            title="Sohbeti Baştan Başlat"
            className="size-8 text-neutral-400 hover:text-white rounded-lg"
          >
            <RotateCcw className="size-4" />
          </Button>
        )}

        {onOpenBrainSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBrainSettings}
            className="h-8 px-2.5 rounded-xl border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 text-xs hidden sm:flex items-center gap-1.5 shadow-sm transition"
            title="Kael-AI Akıllı Beyin Otomatik Hazır"
          >
            <Sparkles className="size-3.5 text-emerald-400" />
            <span className="hidden lg:inline font-medium text-[11px]">Beyin: Aktif</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (autoSpeak) stopNeuralVoice();
            onToggleAutoSpeak?.();
          }}
          title={
            autoSpeak
              ? "Otomatik Sesli Okuma: Açık (Kapatmak için tıkla)"
              : "Otomatik Sesli Okuma: Kapalı (Açmak için tıkla)"
          }
          className="size-8 text-neutral-400 hover:text-white rounded-lg"
        >
          {autoSpeak ? (
            <Volume2 className="size-4 text-emerald-400" />
          ) : (
            <VolumeX className="size-4 text-neutral-500" />
          )}
        </Button>

        {/* Quick Info Icon */}
        <Sheet>
          <SheetTrigger
            className="size-8 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Karakter Kimliği"
          >
            <Info className="size-4" />
          </SheetTrigger>
          <SheetContent className="bg-neutral-900 border-white/10 text-white w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base font-bold text-white">
                {character.name} — Karakter Kimliği
              </SheetTitle>
              <SheetDescription className="text-xs text-neutral-400">
                {character.tagline}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4 text-xs text-neutral-300">
              {character.description && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="font-semibold text-white mb-1">Tanım:</p>
                  <p>{character.description}</p>
                </div>
              )}
              {character.system_prompt && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="font-semibold text-purple-300 mb-1">Karakter Yönergesi (System Prompt):</p>
                  <p className="whitespace-pre-line">{character.system_prompt}</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
