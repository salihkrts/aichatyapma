"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Send,
  CloudRain,
  Flame,
  Wind,
  Play,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { speakWithNeuralVoice, stopNeuralVoice } from "@/lib/voice/voices";
import { recordPlatformActivity } from "@/lib/economy/economy-service";

export interface VnScenario {
  id: string;
  title: string;
  subtitle: string;
  characterId: string;
  characterName: string;
  characterAvatar: string;
  voiceId: string;
  bgImage: string;
  ambientDefault: "rain" | "fire" | "wind" | "off";
  particleType: "sakura" | "rain" | "embers";
  initialEmotion: string;
  openingNarration: string;
  initialChoices: string[];
  systemContext: string;
}

export const VN_SCENARIOS: VnScenario[] = [
  {
    id: "vn-yuki-rooftop",
    title: "🌸 Akademi Çatısında Gün Batımı",
    subtitle: "Romantik & Tsundere Okul Hikayesi",
    characterId: "demo-yuki",
    characterName: "Yuki",
    characterAvatar: "/avatars/yuki.jpg",
    voiceId: "anime-girl-yuki",
    bgImage:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    ambientDefault: "wind",
    particleType: "sakura",
    initialEmotion: "😳 Utangaç & Kızarmış",
    openingNarration:
      "*Akademinin çatı katında turuncu gün batımı rüzgarı kiraz çiçeklerini savuruyor. Yuki korkuluklara yaslanmış, elinde iki kutu çilekli süt tutuyor. Seni görünce irkilip bakışlarını kaçırıyor.* \"Ş-şey... Senpai! Fazladan bir kutu almışım, çöpe gitmesin diye sana veriyorum, sakın yanlış anlama!\"",
    initialChoices: [
      "💝 Gülümseyerek sütü al ve eline hafifçe dokun: 'Teşekkürler Yuki, çok düşüncelisin.'",
      "😏 Takılarak yaklaş: 'Beni beklediğini itiraf etsen ölür müsün?'",
      "🌅 Yanına korkuluklara yaslan ve birlikte gün batımını izlemeyi teklif et.",
    ],
    systemContext:
      "Sen Tsundere anime kızı Yuki'sin. Akademi çatısında gün batımında kullanıcıyla (Senpai) baş başasın. Görsel roman tarzında, duygusal, tatlı ve hafif utangaç tepkiler ver.",
  },
  {
    id: "vn-boz-cyber-noir",
    title: "🌧️ Neon Sokaklarda Gece Sorgusu",
    subtitle: "Polisiye & Siberpunk Gerilim",
    characterId: "demo-komiser-boz",
    characterName: "Komiser Boz",
    characterAvatar: "/avatars/komiser-boz.jpg",
    voiceId: "deep-boss-boz",
    bgImage:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    ambientDefault: "rain",
    particleType: "rain",
    initialEmotion: "😠 Ciddi & Tetikte",
    openingNarration:
      "*Sağanak yağmur neon tabelaların ışığını ıslak asfalta yansıtıyor. Komiser Boz deri pardösüsünün yakasını kaldırıp sana şifreli bir veri diski uzatıyor.* \"Ortak, içerideki köstebek bizi sattı. Bu diski merkeze ulaştırmak için sadece 10 dakikamız var. Planın ne?\"",
    initialChoices: [
      "🔫 Silahı kontrol et: 'Arka sokaktaki zırhlı araçla ablukayı yaralım Komiserim!'",
      "💻 Diski hemen buradaki terminalden kırıp köstebeğin kimliğini öğrenelim.",
      "🕵️ 'Sen çatılardan koruma ateşi aç, ben metro tünellerinden sızacağım.'",
    ],
    systemContext:
      "Sen sert ve tecrübeli Komiser Boz'sun. Yağmurlu bir gece operasyonunda ortağınla (kullanıcı) tehlikeli bir komployu çözüyorsun.",
  },
  {
    id: "vn-lilith-castle",
    title: "🏰 Kızıl Ay Şatosu: Vampirin Daveti",
    subtitle: "Gotik Karanlık Fantezi & Gizem",
    characterId: "demo-lilith",
    characterName: "Lilith",
    characterAvatar: "/avatars/aria.jpg",
    voiceId: "mystic-witch-lilith",
    bgImage:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    ambientDefault: "fire",
    particleType: "embers",
    initialEmotion: "🍷 Büyüleyici & Gizemli",
    openingNarration:
      "*Şöminedeki ateşin kızıl gölgeleri mermer salonda dans ediyor. Kontes Lilith kristal kadehini hafifçe döndürerek kadife koltuktan kalkıp tam önünde duruyor.* \"Yüzyıllardır şatoma kendi isteğiyle giren ilk ölümlüsün... Kalbinin bu kadar hızlı atması korkudan mı, yoksa heyecandan mı?\"",
    initialChoices: [
      "🍷 Gözlerinin içine bak: 'Korksaydım buraya kadar gelmezdim, Lilith.'",
      "🗡️ Gümüş hançeri belinde tutarak: 'Buraya kadim anlaşmayı yenilemeye geldim.'",
      "🌹 Önünde centilmence eğilip elini öp: 'Davetinizi geri çeviremezdim.'",
    ],
    systemContext:
      "Sen gotik vampir kontesi Lilith'sin. Gizemli, çekici ve asil bir üslupla konuşuyorsun.",
  },
  {
    id: "vn-kaito-dragon",
    title: "⚔️ Ejderha Vadisi Kamp Ateşi",
    subtitle: "Epik Fantastik RPG Macerası",
    characterId: "demo-kaito",
    characterName: "Kaito",
    characterAvatar: "/avatars/kaito.jpg",
    voiceId: "young-rebel-kaito",
    bgImage:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    ambientDefault: "fire",
    particleType: "embers",
    initialEmotion: "🔥 Cesur & Kararlı",
    openingNarration:
      "*Kamp ateşinin kıvılcımları yıldızlı gökyüzüne yükselirken uzaktaki dağlardan bir ejderha kükremesi yankılanıyor. Kaito kılıcını bileyip sana dönüyor.* \"Şafak söktüğünde Kızıl Ejder'in inine gireceğiz. Nöbeti ilk kim tutsun, yoksa hemen gece baskını mı yapalım?\"",
    initialChoices: [
      "⚔️ 'Ejderha uyurken gece baskını yapalım, sürpriz avantajı bizde olur!'",
      "🛡️ 'İlk nöbeti ben tutarım Kaito, sen gücünü yarına sakla.'",
      "🧪 Envanterdeki büyü iksirlerini paylaşıp strateji haritasını aç.",
    ],
    systemContext:
      "Sen genç ve cesur kılıç ustası Kaito'sun. Kullanıcı senin en güvendiğin lonca ortağın.",
  },
];

// Procedural Web Audio Ambient Sound Generator (Rain / Fire / Wind)
class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;

  start(mode: "rain" | "fire" | "wind") {
    this.stop();
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= mode === "rain" ? 1.8 : mode === "fire" ? 2.2 : 1.2;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = mode === "wind" ? "bandpass" : "lowpass";
      filter.frequency.value = mode === "rain" ? 950 : mode === "fire" ? 420 : 320;

      const gain = ctx.createGain();
      gain.gain.value = 0.035;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      this.source = noise;
    } catch {
      // ignore
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore
      }
      this.source = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
    }
  }
}

interface VisualNovelViewProps {
  onOpenFullChat?: (characterId: string) => void;
}

export function VisualNovelView({ onOpenFullChat }: VisualNovelViewProps) {
  const [scenario, setScenario] = useState<VnScenario>(VN_SCENARIOS[0]);
  const [sceneText, setSceneText] = useState<string>(VN_SCENARIOS[0].openingNarration);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [choices, setChoices] = useState<string[]>(VN_SCENARIOS[0].initialChoices);
  const [emotion, setEmotion] = useState<string>(VN_SCENARIOS[0].initialEmotion);
  const [affection, setAffection] = useState<number>(45);
  const [customInput, setCustomInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [autoVoice, setAutoVoice] = useState<boolean>(true);
  const [ambientMode, setAmbientMode] = useState<"rain" | "fire" | "wind" | "off">("off");
  const [historyLog, setHistoryLog] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const ambientRef = useRef<AmbientSoundEngine | null>(null);

  useEffect(() => {
    ambientRef.current = new AmbientSoundEngine();
    return () => {
      ambientRef.current?.stop();
      stopNeuralVoice();
    };
  }, []);

  // Typewriter text reveal effect
  useEffect(() => {
    setDisplayedText("");
    let idx = 0;
    const interval = setInterval(() => {
      idx += 3;
      if (idx >= sceneText.length) {
        setDisplayedText(sceneText);
        clearInterval(interval);
      } else {
        setDisplayedText(sceneText.slice(0, idx));
      }
    }, 18);
    return () => clearInterval(interval);
  }, [sceneText]);

  const handleToggleAmbient = (next: "rain" | "fire" | "wind" | "off") => {
    setAmbientMode(next);
    if (next === "off") {
      ambientRef.current?.stop();
    } else {
      ambientRef.current?.start(next);
    }
  };

  const handleSelectScenario = (nextScenario: VnScenario) => {
    stopNeuralVoice();
    setScenario(nextScenario);
    setSceneText(nextScenario.openingNarration);
    setChoices(nextScenario.initialChoices);
    setEmotion(nextScenario.initialEmotion);
    setHistoryLog([
      { role: "assistant", content: nextScenario.openingNarration },
    ]);
  };

  const handleChooseAction = async (chosenAction: string) => {
    if (!chosenAction.trim() || isGenerating) return;
    setIsGenerating(true);
    setCustomInput("");

    recordPlatformActivity({
      username: "kael",
      displayName: "Görsel Roman Oyuncusu",
      avatarUrl: scenario.characterAvatar,
      category: "rpg",
      actionTitle: `Görsel Roman Seçimi (${scenario.characterName})`,
      details: `'${scenario.title}' senaryosunda seçim yaptı.`,
      characterName: scenario.characterName,
      messageSnippet: chosenAction,
      tokensDelta: -2,
      severity: "info",
    });

    const nextHistory = [
      ...historyLog,
      { role: "user" as const, content: chosenAction },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: scenario.characterId,
          characterData: {
            id: scenario.characterId,
            name: scenario.characterName,
            system_prompt: scenario.systemContext,
            greeting_message: scenario.openingNarration,
          },
          message: chosenAction,
          workingHistory: nextHistory.slice(-10),
          affinityScore: affection,
          provider: "free",
        }),
      });

      const rawMeta = response.headers?.get("x-rpg-meta");
      if (rawMeta) {
        try {
          const parsed = JSON.parse(decodeURIComponent(rawMeta));
          if (parsed.emotion) {
            const emoMap: Record<string, string> = {
              happy: "😊 Mutlu & Neşeli",
              shy: "😳 Utangaç & Heyecanlı",
              love: "💖 Romantik & Aşık",
              angry: "😠 Ciddi & Kızgın",
              surprised: "😮 Şaşkın",
            };
            setEmotion(emoMap[parsed.emotion] || "✨ Etkilenmiş");
          }
          if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
            setChoices(parsed.choices);
          }
        } catch {
          // ignore
        }
      }

      let fullReply = "";
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullReply += decoder.decode(value, { stream: true });
        }
      }

      if (fullReply.trim()) {
        setSceneText(fullReply.trim());
        setAffection((prev) => Math.min(100, prev + 5));
        setHistoryLog([...nextHistory, { role: "assistant", content: fullReply.trim() }]);

        if (autoVoice) {
          speakWithNeuralVoice({
            text: fullReply.trim(),
            voiceId: scenario.voiceId,
          });
        }
      }
    } catch {
      // Fallback continuation
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
      {/* Top Scenario Selector & Ambient Audio Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          {VN_SCENARIOS.map((sc) => {
            const isActive = sc.id === scenario.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25"
                    : "bg-white/5 text-neutral-400 hover:text-white border border-white/5"
                }`}
              >
                <span>{sc.title}</span>
              </button>
            );
          })}
        </div>

        {/* Ambient Soundscape & Auto-TTS Controls */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-neutral-400 font-semibold mr-1">
            Ortam Sesi:
          </span>
          {[
            { id: "rain", label: "Yağmur", icon: CloudRain },
            { id: "fire", label: "Ateş", icon: Flame },
            { id: "wind", label: "Rüzgar", icon: Wind },
            { id: "off", label: "Sessiz", icon: VolumeX },
          ].map((amb) => {
            const Icon = amb.icon;
            const active = ambientMode === amb.id;
            return (
              <button
                key={amb.id}
                type="button"
                onClick={() =>
                  handleToggleAmbient(amb.id as "rain" | "fire" | "wind" | "off")
                }
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  active
                    ? "bg-cyan-500/25 border border-cyan-400/50 text-cyan-200"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-white/10"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{amb.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setAutoVoice((p) => !p)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ml-1 ${
              autoVoice
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-neutral-950 border border-white/10 text-neutral-400"
            }`}
            title="Diyalogları Otomatik Seslendir"
          >
            <Volume2 className="size-3.5" />
            <span>Oto-Ses: {autoVoice ? "AÇIK" : "KAPALI"}</span>
          </button>
        </div>
      </div>

      {/* Main Visual Novel Theater Stage */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/40 shadow-2xl min-h-[560px] flex flex-col justify-between bg-neutral-950">
        {/* Background Atmospheric Scene Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
          style={{ backgroundImage: `url(${scenario.bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/65 to-neutral-950/30" />

        {/* Stage Top HUD: Scenario Title, Emotion & Affection */}
        <div className="relative z-10 p-5 flex items-center justify-between gap-4">
          <div>
            <Badge className="bg-purple-500/25 text-purple-200 border-purple-500/40 text-[10px] font-mono uppercase">
              📖 Görsel Roman / İnteraktif Hikaye Modu
            </Badge>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              {scenario.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-pink-500/25 text-pink-200 border-pink-500/40 text-xs px-3 py-1">
              <Heart className="size-3.5 mr-1 fill-pink-400 text-pink-400" />
              Samimiyet: %{affection}
            </Badge>

            {onOpenFullChat && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenFullChat(scenario.characterId)}
                className="border-white/20 bg-black/50 hover:bg-black/80 text-white text-xs rounded-xl h-8 cursor-pointer"
              >
                <MessageSquare className="size-3.5 mr-1.5" />
                Tam Sohbete Geç
              </Button>
            )}
          </div>
        </div>

        {/* Center Expressive Character Portrait Sprite */}
        <div className="relative z-10 flex flex-col items-center justify-center my-2 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${scenario.id}-${emotion}`}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative group"
            >
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-purple-600/40 to-pink-500/40 blur-xl" />
              <img
                src={scenario.characterAvatar}
                alt={scenario.characterName}
                className="relative size-44 sm:size-52 rounded-3xl object-cover border-2 border-purple-400/60 shadow-[0_15px_45px_rgba(0,0,0,0.8)]"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full bg-neutral-900/95 border border-purple-500/50 text-xs font-extrabold text-purple-200 shadow-lg">
                {emotion}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom VN Translucent Dialogue Box & Interactive Choices */}
        <div className="relative z-10 p-5 sm:p-6 space-y-4">
          {/* Dialogue Box */}
          <div className="rounded-3xl border border-purple-500/40 bg-neutral-950/90 backdrop-blur-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-black tracking-wide shadow">
                  {scenario.characterName}
                </span>
                {isGenerating && (
                  <span className="text-xs text-purple-300 font-mono flex items-center gap-1">
                    <Sparkles className="size-3.5 animate-spin" />
                    Sahne yazılıyor...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    speakWithNeuralVoice({
                      text: sceneText,
                      voiceId: scenario.voiceId,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/35 border border-pink-500/40 text-pink-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Volume2 className="size-3.5" />
                  <span>Seslendir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectScenario(scenario)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
                  title="Sahneyi Baştan Başlat"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-neutral-100 leading-relaxed min-h-[3.5rem]">
              {displayedText}
            </p>
          </div>

          {/* 3 Interactive Choice Buttons + Custom Action Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {choices.map((choice, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={isGenerating}
                onClick={() => handleChooseAction(choice)}
                className="p-3 rounded-2xl border border-purple-500/35 bg-neutral-900/90 hover:bg-purple-950/60 hover:border-purple-400 text-left text-xs font-semibold text-neutral-100 transition shadow-lg cursor-pointer flex items-start gap-2"
              >
                <span className="size-5 rounded-lg bg-purple-600/30 border border-purple-400/40 text-purple-200 font-black flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <span className="line-clamp-2">{choice}</span>
              </motion.button>
            ))}
          </div>

          {/* Custom Action Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleChooseAction(customInput);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              disabled={isGenerating}
              placeholder="Veya kendi eylemini / diyaloğunu buraya yaz..."
              className="bg-neutral-900/90 border-white/15 text-xs text-white h-10 rounded-xl"
            />
            <Button
              type="submit"
              disabled={isGenerating || !customInput.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs h-10 px-5 rounded-xl shrink-0 cursor-pointer"
            >
              <Send className="size-3.5 mr-1.5" />
              Sahneyi İlerlet
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
