"use client";

import { useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  User,
  Brain,
  BookOpen,
  ShieldCheck,
  Save,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Wand2,
  Zap,
  CheckCircle2,
  Globe,
  Lock,
  Upload,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  characterSchema,
  defaultCharacterValues,
  type CharacterFormData,
} from "@/lib/validations/character";
import { createCharacterAction } from "@/app/actions/character";
import { parseCharacterCardV2File } from "@/lib/rpg/rpg-engine";

import { ForgeImageGen, CHARACTER_ARCHETYPES } from "@/components/forge/forge-image-gen";
import { ForgeCoreDemographics } from "@/components/forge/forge-core-demographics";
import { ForgePsychology } from "@/components/forge/forge-psychology";
import { ForgeLoreRag } from "@/components/forge/forge-lore-rag";
import { ForgeGuardrailsModel } from "@/components/forge/forge-guardrails-model";
import { ForgePreviewCard } from "@/components/forge/forge-preview-card";

const STEPS = [
  { id: "image-gen", label: "Görsel & Avatar", icon: Wand2 },
  { id: "demographics", label: "Kimlik & Ses", icon: User },
  { id: "psychology", label: "Kişilik", icon: Brain },
  { id: "lore", label: "Tanım & Hikaye", icon: BookOpen },
  { id: "guardrails", label: "Model & Yayın", icon: ShieldCheck },
] as const;

interface ForgeViewProps {
  onSuccess?: (characterId: string) => void;
  onCancel?: () => void;
}

const ARCHITECT_PRESETS = [
  { label: "🐻 Polis Ayı Komiser (Furry)", archetype: "furry", idea: "Cinayet masasında görev yapan, lacivert polis üniformalı, altın rozetli, sert ama babacan, bal ve kahve tiryakisi polis bir boz ayı" },
  { label: "🌸 Tatlı Anime Kızı", archetype: "anime", idea: "Tatlı, sevimli, manga seven utangaç lise anime kızı" },
  { label: "🐾 Siber Kurt (Fursona)", archetype: "fursona", idea: "Neon mavi-sümüş kürklü, deri ceketli ve kulaklıklı siberpunk kurt fursona" },
  { label: "🤖 Kuantum Android (Robotik)", archetype: "robotic", idea: "Beyaz titanyum zırhlı, mavi optik sensörlü, insan duygularını öğrenmeye çalışan siber-android muhafız" },
  { label: "🏎️ Asi Sokak Yarışçısı (Gerçekçi)", archetype: "realistic", idea: "Gece yarışlarının yenilmez mekanik dehası, deri ceketli dobra sokak yarışçısı kız" },
  { label: "🔮 Gotik Cadı (Persona)", archetype: "persona", idea: "Antik tarot sırlarını bilen gizemli, siyah dantelli karanlık gece cadısı" },
];

export function ForgeView({ onSuccess, onCancel }: ForgeViewProps) {
  const [activeTab, setActiveTab] = useState<string>("image-gen");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Karakter Mimarı (AI Architect) State
  const [architectPrompt, setArchitectPrompt] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<string>("furry");
  const [isArchitectRunning, setIsArchitectRunning] = useState(false);
  const [isLoreGenerating, setIsLoreGenerating] = useState(false);
  const [architectSuccess, setArchitectSuccess] = useState<string | null>(null);
  const [externalPrompt, setExternalPrompt] = useState<string>("");

  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      ...defaultCharacterValues,
      is_public: true,
    },
    mode: "onChange",
  });

  const { handleSubmit, watch, setValue } = form;
  const formData = watch();
  const isPublic = formData.is_public;

  const currentStepIndex = STEPS.findIndex((s) => s.id === activeTab);

  // Karakter Mimarı: Tek Tıkla Tüm Karakteri ve Görselleri Otomatik Üret
  const handleRunArchitect = async (customIdea?: string, customArchetype?: string) => {
    const ideaToUse = (customIdea || architectPrompt).trim();
    const archToUse = customArchetype || selectedArchetype;
    if (!ideaToUse || isArchitectRunning) return;

    setIsArchitectRunning(true);
    setArchitectSuccess(null);
    setSubmitError(null);

    try {
      const res = await fetch("/api/character-architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaToUse,
          archetype: archToUse,
          currentData: formData,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Karakter Mimarı çalışırken bir hata oluştu.");
      }

      const p = data.profile;

      // Form alanlarını otomatik olarak doldur
      setValue("name", p.name, { shouldValidate: true });
      setValue("tagline", p.tagline, { shouldValidate: true });
      setValue("description", p.description, { shouldValidate: true });
      setValue("category", p.category, { shouldValidate: true });
      setValue("trait_empathy", p.trait_empathy);
      setValue("trait_humor", p.trait_humor);
      setValue("trait_aggression", p.trait_aggression);
      setValue("trait_formality", p.trait_formality);
      setValue("trait_creativity", p.trait_creativity);
      setValue("trait_curiosity", p.trait_curiosity);
      setValue("trait_confidence", p.trait_confidence);
      setValue("trait_warmth", p.trait_warmth);
      setValue("system_prompt", p.system_prompt, { shouldValidate: true });
      setValue("backstory", p.backstory);
      setValue("worldview", p.worldview);
      if (p.secrets) setValue("secrets", p.secrets);
      if (p.example_dialogues) setValue("example_dialogues", p.example_dialogues);
      setValue("greeting_message", p.greeting_message, { shouldValidate: true });
      setValue("avatar_prompt", p.avatar_prompt, { shouldValidate: true });
      if (Array.isArray(p.tags) && p.tags.length > 0) {
        setValue("tags", p.tags, { shouldValidate: true });
      }

      // Görsel üreticiyi otomatik tetikle
      setExternalPrompt(p.avatar_prompt);
      setActiveTab("image-gen");

      setArchitectSuccess(
        `✨ Karakter Mimarı '${p.name}' (${archToUse.toUpperCase()}) karakterinin tüm kişiliğini, hikayesini, konuşma tarzını ve görselini hazırladı!`
      );
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Karakter Mimarı çalıştırılamadı."
      );
    } finally {
      setIsArchitectRunning(false);
    }
  };

  // Kişilikten Sonra Otomatik Karakter Tanımı & Hikaye Üret
  const handleAutoGenerateLoreFromTraits = async () => {
    if (isLoreGenerating) return;
    setIsLoreGenerating(true);
    setSubmitError(null);

    try {
      const ideaSeed =
        [formData.name, formData.tagline, formData.avatar_prompt, formData.description, architectPrompt]
          .filter(Boolean)
          .join(" - ") || "Özgün bir rol yapma karakteri";

      const res = await fetch("/api/character-architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaSeed,
          currentData: formData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.profile) {
        const p = data.profile;
        if (!formData.name || formData.name.trim().length < 2) {
          setValue("name", p.name, { shouldValidate: true });
        }
        if (!formData.tagline || formData.tagline.trim().length < 2) {
          setValue("tagline", p.tagline, { shouldValidate: true });
        }
        setValue("description", p.description, { shouldValidate: true });
        setValue("system_prompt", p.system_prompt, { shouldValidate: true });
        setValue("backstory", p.backstory, { shouldValidate: true });
        setValue("worldview", p.worldview, { shouldValidate: true });
        if (p.secrets) setValue("secrets", p.secrets, { shouldValidate: true });
        if (p.example_dialogues) {
          setValue("example_dialogues", p.example_dialogues, { shouldValidate: true });
        }
        if (p.greeting_message) {
          setValue("greeting_message", p.greeting_message, { shouldValidate: true });
        }
        setActiveTab("lore");
        setArchitectSuccess(
          `✨ Kişilik ve görsel analiz edildi! '${formData.name || p.name}' için karakter tanımı, geçmiş hikayesi ve konuşma üslubu oluşturuldu.`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Otomatik tanım hatası:", err);
      setActiveTab("lore");
    } finally {
      setIsLoreGenerating(false);
    }
  };

  const handleImageSelected = (imageUrl: string, promptText: string) => {
    setValue("avatar_url", imageUrl, { shouldValidate: true });
    setValue("avatar_prompt", promptText, { shouldValidate: true });
    // Otomatik olarak bir sonraki adıma (Kimlik & Ses) geç
    setActiveTab("demographics");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onInvalid = (errors: FieldErrors<CharacterFormData>) => {
    console.warn("Validation errors:", errors);
    if (errors.name) {
      setActiveTab("demographics");
      setSubmitError("Lütfen karakterinize bir isim verin (Adım 2: Kimlik & Ses).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (errors.system_prompt || errors.greeting_message) {
      setActiveTab("lore");
      setSubmitError("Lütfen karakterinizin sistem talimatını ve selamlama mesajını kontrol edin (Adım 4).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitError("Lütfen eksik alanları doldurunuz.");
  };

  const onSubmit = async (data: CharacterFormData) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Otomatik fallback: Boş kalan veya takılan kritik alanları güvene al
      let finalName = data.name?.trim();
      if (!finalName || finalName.length < 2) {
        if (data.avatar_prompt) {
          finalName = data.avatar_prompt.split(",")[0].trim().slice(0, 30);
        }
        if (!finalName || finalName.length < 2) {
          finalName = "Kael Kahramanı";
        }
        data.name = finalName;
        setValue("name", finalName, { shouldValidate: true });
      }

      if (!data.avatar_url || data.avatar_url.trim().length === 0) {
        data.avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
        setValue("avatar_url", data.avatar_url);
      }

      if (!data.system_prompt || data.system_prompt.length < 10) {
        data.system_prompt = `Sen ${finalName} karakterisin. ${data.tagline || ""} ${data.description || ""} Kendine has konuşma tarzınla, hareketlerini *yıldızlar* içinde betimleyerek samimi ve canlı Türkçe konuş. Asla rolünden çıkma.`;
        setValue("system_prompt", data.system_prompt);
      }

      if (!data.greeting_message || data.greeting_message.trim().length === 0) {
        data.greeting_message = `*Sana doğru dönüp kendine has bir tebessümle bakar* Merhaba! Ben ${finalName}. Seninle tanıştığıma memnun oldum, bugün nereden başlıyoruz?`;
        setValue("greeting_message", data.greeting_message);
      }

      // Supabase server action'ı çağır
      const res = await createCharacterAction(data);

      const characterId = res.success && res.data?.characterId
        ? res.data.characterId
        : `char-${Date.now()}`;

      // LocalStorage'a kaydet (Kayıtlılar listesinde, Keşfet'te ve sohbette hemen görünmesi için)
      try {
        const localChar = {
          ...data,
          id: characterId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_chats: 1,
          total_messages: 1,
          likes_count: data.is_public ? 1 : 0,
          forks_count: 0,
          profiles: {
            username: "senin_eserin",
            display_name: "Topluluk Üyesi",
            avatar_url: data.avatar_url,
          },
        };

        const existing = JSON.parse(
          localStorage.getItem("kael_saved_characters") || "[]"
        );
        const updated = [localChar, ...existing.filter((c: { id: string }) => c.id !== characterId)];
        localStorage.setItem("kael_saved_characters", JSON.stringify(updated));
      } catch (err) {
        console.warn("LocalStorage kaydetme hatası:", err);
      }

      if (onSuccess) {
        onSuccess(characterId);
      }
    } catch (err: unknown) {
      console.error("Karakter oluşturma hatası:", err);
      setSubmitError(
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setActiveTab(STEPS[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setActiveTab(STEPS[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Tavern / Chub AI Character Card V2 (.json veya .png) İçe Aktarma
  const handleImportTavernCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubmitError(null);
      const parsed = await parseCharacterCardV2File(file);
      setValue("name", parsed.name, { shouldValidate: true });
      setValue("tagline", parsed.tagline, { shouldValidate: true });
      setValue("description", parsed.description, { shouldValidate: true });
      setValue("system_prompt", parsed.system_prompt, { shouldValidate: true });
      setValue("backstory", parsed.backstory, { shouldValidate: true });
      setValue("greeting_message", parsed.greeting_message, { shouldValidate: true });
      setValue("example_dialogues", parsed.example_dialogues, { shouldValidate: true });
      setValue("tags", parsed.tags, { shouldValidate: true });
      if (parsed.avatarDataUrl) {
        setValue("avatar_url", parsed.avatarDataUrl, { shouldValidate: true });
      }
      setArchitectSuccess(
        `"${parsed.name}" karakter kartı (Tavern / Chub AI V2) tüm sistem promptu ve diyalog örnekleriyle başarıyla içe aktarıldı!`
      );
      setActiveTab("lore");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Karakter kartı (.json / .png) okunamadı."
      );
    } finally {
      e.target.value = "";
    }
  };

  // Tavern / Chub AI Character Card V2 (.json) Dışa Aktarma
  const handleExportTavernCard = () => {
    const cardSpec = {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: formData.name || "Kael Karakteri",
        description: formData.description || "",
        personality: formData.tagline || "",
        scenario: formData.backstory || "",
        first_mes: formData.greeting_message || "",
        mes_example: formData.example_dialogues || "",
        system_prompt: formData.system_prompt || "",
        creator_notes: "Kael-AI Karakter Atölyesi tarafından üretildi (Spec V2).",
        tags: formData.tags || [],
        creator: "kael_studio",
        character_version: "2.0",
      },
    };
    const blob = new Blob([JSON.stringify(cardSpec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(formData.name || "karakter").toLowerCase().replace(/\s+/g, "_")}_card_v2.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-white/10 gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Karakter Atölyesi</h1>
            <p className="text-xs text-neutral-400">
              Görselini çizdir, kişiliğini ayarla, Tavern/Chub V2 kartı aktar ve Keşfet&apos;te yayınla
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tavern / Chub AI V2 Import Button */}
          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 transition">
            <Upload className="size-3.5 text-purple-400" />
            <span>Kart İçe Aktar (.JSON / .PNG V2)</span>
            <input
              type="file"
              accept=".json,.png,application/json,image/png"
              onChange={handleImportTavernCard}
              className="hidden"
            />
          </label>

          {/* Tavern / Chub AI V2 Export Button */}
          <button
            type="button"
            onClick={handleExportTavernCard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-300 transition"
            title="Bu karakteri SillyTavern / Chub AI Spec V2 (.json) formatında indir"
          >
            <Download className="size-3.5 text-cyan-400" />
            <span>Kart Dışa Aktar (V2)</span>
          </button>

          {/* Keşfet'te Yayınla Toggle Button */}
          <button
            type="button"
            onClick={() => setValue("is_public", !isPublic, { shouldValidate: true })}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isPublic
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-sm"
                : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
            }`}
            title="Açık olduğunda oluşturduğun karakter Keşfet vitrininde yayınlanır"
          >
            {isPublic ? (
              <>
                <Globe className="size-3.5 text-emerald-400" />
                <span>Keşfet&apos;te Yayınla: Açık</span>
              </>
            ) : (
              <>
                <Lock className="size-3.5 text-neutral-400" />
                <span>Sadece Bana Özel</span>
              </>
            )}
          </button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-300 text-xs rounded-xl"
            >
              Vazgeç
            </Button>
          )}
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit, onInvalid)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/30 transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 mr-2 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Save className="size-3.5 mr-2" />
                {isPublic ? "Yayınla & Sohbete Başla" : "Kaydet & Sohbete Başla"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hızlı Oluştur (AI Karakter Mimarı) */}
      <div className="mt-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Tek Tıkla Komple Karakter Mimarı</h2>
            <span className="text-xs text-neutral-400 hidden sm:inline">
              — önce türünü seç (Gerçekçi, Anime, Furry, Fursona, Robotik, Persona), sonra fikrini yaz!
            </span>
          </div>
        </div>

        {/* Karakter Türü Seçim Hapları */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-purple-300 mr-1">Tür Seç:</span>
          {CHARACTER_ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              type="button"
              onClick={() => setSelectedArchetype(arch.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                selectedArchetype === arch.id
                  ? "bg-purple-600 border-purple-400 text-white font-semibold shadow-sm shadow-purple-600/30"
                  : "bg-white/[0.03] border-white/10 text-neutral-300 hover:bg-white/[0.08]"
              }`}
            >
              <span>{arch.emoji}</span>
              <span>{arch.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={architectPrompt}
            onChange={(e) => setArchitectPrompt(e.target.value)}
            placeholder="Örn: Cinayet masasında çalışan, lacivert üniformalı ve rozetli polis bir ayı..."
            className="bg-black/40 border-white/10 text-white placeholder:text-neutral-500 text-sm h-10 rounded-xl flex-1 focus:border-purple-500/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRunArchitect();
            }}
          />
          <Button
            type="button"
            disabled={isArchitectRunning || !architectPrompt.trim()}
            onClick={() => handleRunArchitect()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm h-10 px-4 rounded-xl shrink-0 disabled:opacity-40"
          >
            {isArchitectRunning ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <Wand2 className="size-4 mr-1.5" />
                Otomatik Oluştur
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ARCHITECT_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={isArchitectRunning}
              onClick={() => {
                setSelectedArchetype(p.archetype);
                setArchitectPrompt(p.idea);
                handleRunArchitect(p.idea, p.archetype);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/10 text-neutral-400 hover:text-white hover:border-purple-500/40 transition-all disabled:opacity-40 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Architect Success Notification */}
      {architectSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>{architectSuccess}</span>
          </div>
          <button
            onClick={() => setArchitectSuccess(null)}
            className="text-emerald-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Error notification banner */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between"
        >
          <span>{submitError}</span>
          <button
            onClick={() => setSubmitError(null)}
            className="text-red-400 hover:text-white"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Main Grid: Form Left, Preview Right */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Multi-tab Character Creation Form */}
        <div className="lg:col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Stepper Tabs Bar */}
            <TabsList className="w-full grid grid-cols-5 bg-neutral-900/60 border border-white/10 p-1 rounded-xl mb-6">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPast = idx < currentStepIndex;

                return (
                  <TabsTrigger
                    key={step.id}
                    value={step.id}
                    className="flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30"
                  >
                    {isPast ? (
                      <Check className="size-3.5 text-emerald-400" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TabsContent value="image-gen" className="mt-0 outline-none">
                    <ForgeImageGen
                      onImageSelected={handleImageSelected}
                      externalPrompt={externalPrompt}
                      selectedArchetype={selectedArchetype}
                      onArchetypeChange={setSelectedArchetype}
                    />
                  </TabsContent>

                  <TabsContent value="demographics" className="mt-0 outline-none">
                    <ForgeCoreDemographics form={form} />
                  </TabsContent>

                  <TabsContent value="psychology" className="mt-0 outline-none">
                    <ForgePsychology
                      form={form}
                      onAutoGenerateLore={handleAutoGenerateLoreFromTraits}
                      onGoToLore={() => {
                        setActiveTab("lore");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      isGeneratingLore={isLoreGenerating}
                    />
                  </TabsContent>

                  <TabsContent value="lore" className="mt-0 outline-none">
                    <ForgeLoreRag form={form} />
                  </TabsContent>

                  <TabsContent value="guardrails" className="mt-0 outline-none">
                    <ForgeGuardrailsModel form={form} />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>

              {/* Step Navigation Controls */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  className="border-white/10 bg-white/[0.03] text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-40"
                >
                  <ArrowLeft className="size-3.5 mr-2" /> Geri
                </Button>

                <div className="text-[11px] font-mono text-neutral-400">
                  Adım {currentStepIndex + 1} / {STEPS.length}
                </div>

                {currentStepIndex < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20"
                  >
                    Sonraki Adım <ArrowRight className="size-3.5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onSubmit, onInvalid)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save className="size-3.5 mr-2" />{" "}
                        {isPublic ? "Keşfet'te Yayınla ve Sohbete Geç" : "Kaydet ve Sohbete Geç"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Tabs>
        </div>

        {/* Right Column: Sticky Holographic Preview */}
        <div className="lg:col-span-4 hidden lg:block">
          <ForgePreviewCard data={formData} />
        </div>
      </div>
    </div>
  );
}
