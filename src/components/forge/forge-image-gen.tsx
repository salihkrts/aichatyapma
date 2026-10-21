"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2, RefreshCw, Check, ArrowRight, Sparkles, AlertCircle, Upload, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ForgeImageGenProps {
  onImageSelected: (imageUrl: string, prompt: string) => void;
  externalPrompt?: string;
  selectedArchetype?: string;
  onArchetypeChange?: (archetype: string) => void;
}

export const CHARACTER_ARCHETYPES = [
  { id: "realistic", label: "Gerçekçi İnsan", emoji: "📷", desc: "Fotogerçekçi portre ve gerçek dünya stili" },
  { id: "anime", label: "Anime / Manga", emoji: "🌸", desc: "Japon anime ve manga illüstrasyon stili" },
  { id: "furry", label: "Furry (Antropomorfik)", emoji: "🐺", desc: "Kıyafetli, meslek sahibi insansı hayvan karakter" },
  { id: "fursona", label: "Fursona", emoji: "🐾", desc: "Özel kürk desenli, aksesuarlı kişisel furry kimliği" },
  { id: "robotic", label: "Robotik / Cyborg", emoji: "🤖", desc: "Mekanik şasili, optik sensörlü android & robot" },
  { id: "persona", label: "Persona / Fantastik", emoji: "🎭", desc: "Özel kostümlü fantastik veya rol yapma arketipi" },
  { id: "3d", label: "3D Animasyon", emoji: "🧸", desc: "Zootopia & Pixar kalitesinde 3D karakter" },
] as const;

const IDEAS_BY_STYLE: Record<string, string[]> = {
  realistic: [
    "Gece vardiyasında çalışan deri ceketli dedektif",
    "Boğaz'a karşı duran karizmatik siyah takım elbiseli patron",
    "Beyaz önlüklü, stetoskoplu genç kadın doktor",
  ],
  anime: [
    "Mor gözlü, gümüş saçlı neşeli anime lise kızı",
    "Kollarını kavuşturmuş utangaç tsundere büyücü kız",
    "Karanlık pelerinli kırmızı gözlü samuray",
  ],
  furry: [
    "Lacivert polis üniformalı, altın rozetli ve trençkotlu komiser boz ayı",
    "Deri korucu zırhlı, gümüş kürklü ve kehribar gözlü kurt muhafız",
    "Tamirci tulumu giymiş, elinde ingiliz anahtarı tutan tilki mekanik",
  ],
  fursona: [
    "Neon mavi-siyah kürklü, kulaklıklı ve kapüşonlu siberpunk kurt fursona",
    "Pastel pembe-beyaz kürklü, gözlük takan sevimli kedi barista fursona",
    "Altın boynuzlu ve pelerinli ejderha-kurt melez fursona",
  ],
  robotic: [
    "Beyaz titanyum zırhlı, parlayan mavi optik gözlü kadın android muhafız",
    "Neon vizörlü, krom kolları olan siberborg netrunner",
    "Antik rünlerle çalışan altın-bronz steampunk otomat şövalye",
  ],
  persona: [
    "Siyah dantelli, mum ışığında tarot kartları tutan gotik gece cadısı",
    "Fırtınalı güvertede üç köşeli şapkalı korsan kaptanı",
    "Bozkırda kurt başlı kılıç taşıyan zırhlı Türk komutanı",
  ],
  "3d": [
    "Polis rozetli, elinde bal kavanozu tutan sevimli ama sert komiser ayı",
    "RGB oyuncu odasında kedi kulaklıklı yayıncı kız",
    "Sihirli asa taşıyan zümrüt gözlü elf okçu",
  ],
};

async function compressImage(dataUrl: string, size = 512): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function ForgeImageGen({
  onImageSelected,
  externalPrompt,
  selectedArchetype = "anime",
  onArchetypeChange,
}: ForgeImageGenProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>(selectedArchetype || "anime");
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<string>("");
  const [canUseNsfw, setCanUseNsfw] = useState(false);
  const [nsfwMode, setNsfwMode] = useState(false);
  const lastExternal = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lütfen geçerli bir görsel dosyası seç (PNG, JPG, WebP vb.).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const small = await compressImage(base64, 512);
        setImages([small]);
        setSelected(0);
        setError(null);
        setUnderstood("Cihazından yüklenen avatar görseli.");
      } catch {
        setError("Görsel yüklenirken bir sorun oluştu.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Yalnızca yaşı doğrulanmış (18+) ve NSFW özelliğini açmış hesaplar 18+ modu kullanabilir
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kael_auth_session");
      const s = raw ? JSON.parse(raw) : null;
      setCanUseNsfw(Boolean(s && !s.isGuest && s.isAdult && s.nsfwEnabled));
    } catch {
      setCanUseNsfw(false);
    }
  }, []);

  useEffect(() => {
    if (selectedArchetype && selectedArchetype !== style) {
      setStyle(selectedArchetype);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArchetype]);

  const handleStyleSelect = (newStyle: string) => {
    setStyle(newStyle);
    if (onArchetypeChange) onArchetypeChange(newStyle);
  };

  const generate = async (text: string, overrideStyle?: string) => {
    if (!text.trim() || isGenerating) return;
    const activeStyle = overrideStyle || style;
    setIsGenerating(true);
    setError(null);
    setImages([]);
    setSelected(null);
    setUnderstood("");

    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          style: activeStyle,
          nsfw: canUseNsfw && nsfwMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.images?.length) {
        setError(data.error || "Görsel üretilemedi, tekrar dene.");
        return;
      }
      setImages(data.images);
      if (data.images.length === 1) {
        setSelected(0);
      }
      setUnderstood(data.enhancedPrompt || "");
    } catch {
      setError("Bağlantı hatası. İnternetini kontrol edip tekrar dene veya doğrudan fotoğraf yükle.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim() && externalPrompt !== lastExternal.current) {
      lastExternal.current = externalPrompt;
      setPrompt(externalPrompt);
      generate(externalPrompt, selectedArchetype || style);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const currentIdeas = IDEAS_BY_STYLE[style] || IDEAS_BY_STYLE.anime;
  const currentArchetypeInfo = CHARACTER_ARCHETYPES.find((a) => a.id === style);

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
          <Wand2 className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">
            1. Karakter Türünü Seç & Görselini Çizdir
          </h2>
          <p className="text-xs text-neutral-400">
            Gerçekçi, Anime, Furry, Fursona, Robotik veya Persona türünü seç; yapay zeka tam kıyafetli 4 farklı portre çizsin.
          </p>
        </div>
      </div>

      {/* Karakter Türü / Arketip Seçici */}
      <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-purple-300">
            Karakter Türü & Çizim Stili:
          </span>
          {currentArchetypeInfo && (
            <span className="text-[11px] text-neutral-400">
              {currentArchetypeInfo.emoji} {currentArchetypeInfo.desc}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {CHARACTER_ARCHETYPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleStyleSelect(s.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                style === s.id
                  ? "bg-gradient-to-br from-purple-600/40 to-pink-600/30 border-purple-400 text-white shadow-md shadow-purple-600/20"
                  : "bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/[0.08] hover:border-white/20"
              }`}
            >
              <span className="text-lg mb-0.5">{s.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 18+ Modu (yalnızca doğrulanmış yetişkin + NSFW açık hesaplar) */}
      {canUseNsfw ? (
        <button
          type="button"
          onClick={() => setNsfwMode((p) => !p)}
          className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
            nsfwMode
              ? "bg-red-950/40 border-red-500/60"
              : "bg-neutral-900/80 border-white/10 hover:border-white/25"
          }`}
        >
          <div>
            <div className="text-xs font-bold text-white">🔞 18+ Yetişkin Görsel Modu</div>
            <div className="text-[11px] text-neutral-400">
              Sadece yetişkin karakterler için. Reşit olmayan/okul çağı tarifler otomatik engellenir.
            </div>
          </div>
          <span
            className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
              nsfwMode ? "bg-red-500 text-white" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {nsfwMode ? "AÇIK" : "KAPALI"}
          </span>
        </button>
      ) : (
        <p className="text-[11px] text-neutral-500">
          🔒 18+ görsel modu için 18 yaşını doğrulayıp profilinde NSFW özelliğini açman gerekir.
        </p>
      )}

      {/* Prompt kutusu */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 focus-within:border-purple-500/50 transition-colors space-y-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Örn: Lacivert polis üniformalı, göğsünde altın rozeti ve elinde bal kavanozu olan sert komiser boz ayı..."
          className="min-h-[85px] border-0 bg-transparent p-1 text-white placeholder:text-neutral-500 text-sm resize-none focus-visible:ring-0 shadow-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              generate(prompt);
            }
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
          {/* Hızlı fikirler */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-neutral-500 mr-1">Örnek ({currentArchetypeInfo?.label}):</span>
            {currentIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setPrompt(idea)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white hover:border-purple-500/40 transition-all line-clamp-1 max-w-[260px]"
              >
                {idea}
              </button>
            ))}
          </div>

          {/* Butonlar */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-white/10 hover:border-purple-500/40 hover:bg-purple-600/10 text-neutral-300 hover:text-white rounded-xl h-9 px-3.5 text-xs font-medium"
              title="Kendi bilgisayarından veya telefonundan bir fotoğraf seç"
            >
              <Upload className="size-3.5 mr-1.5 text-purple-400" /> Fotoğraf Yükle
            </Button>

            <Button
              type="button"
              onClick={() => generate(prompt)}
              disabled={!prompt.trim() || isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl h-9 px-5 disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Çiziliyor...
                </>
              ) : images.length ? (
                <>
                  <RefreshCw className="size-4 mr-2" /> Yeniden Çiz
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" /> 4 Görsel Çiz
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="underline text-purple-300 hover:text-white font-medium"
            >
              Fotoğraf Yükle
            </button>
            <button
              type="button"
              onClick={() => generate(prompt)}
              className="underline hover:text-white font-medium"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      )}

      {/* Yükleniyor iskeleti */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-gradient-to-br from-neutral-900 via-purple-950/30 to-neutral-900 border border-white/5 animate-pulse flex items-center justify-center"
              >
                <Sparkles className="size-6 text-purple-500/40" />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-neutral-500">
            Yapay zeka ({currentArchetypeInfo?.label}) stilinde görsel çiziyor, yaklaşık 10-18 saniye sürebilir...
          </p>
        </div>
      )}

      {/* Sonuçlar */}
      <AnimatePresence>
        {images.length > 0 && !isGenerating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {understood && (
              <p className="text-[11px] text-neutral-500 line-clamp-2">
                <span className="text-purple-400">Görsel Kaynağı:</span> {understood}
              </p>
            )}

            <div
              className={`grid gap-3 ${
                images.length === 1 ? "grid-cols-1 max-w-[320px] mx-auto" : "grid-cols-2"
              }`}
            >
              {images.map((img, idx) => {
                const isSel = selected === idx;
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => setSelected(idx)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                      isSel
                        ? "border-purple-500 ring-4 ring-purple-500/30"
                        : "border-transparent hover:border-white/20"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Seçenek ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {isSel && (
                      <div className="absolute top-2 right-2 size-7 rounded-full bg-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                        <Check className="size-4 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <Button
              type="button"
              onClick={async () => {
                if (selected === null) return;
                const small = await compressImage(images[selected]);
                onImageSelected(small, prompt.trim());
              }}
              disabled={selected === null}
              className="w-full bg-white hover:bg-neutral-100 text-black font-bold rounded-xl h-11 disabled:opacity-30"
            >
              {selected === null ? "Beğendiğin görsele tıkla" : "Bu Görseli Kullan ve Devam Et"}
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
