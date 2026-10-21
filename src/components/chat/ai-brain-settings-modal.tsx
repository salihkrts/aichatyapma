"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Key,
  Zap,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Flame,
  ShieldAlert,
  Loader2,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface BrainSettings {
  provider: "free" | "groq" | "openrouter" | "openai";
  apiKey: string;
  model: string;
}

export const DEFAULT_BRAIN_SETTINGS: BrainSettings = {
  provider: "free",
  apiKey: "",
  model: "default",
};

interface AiBrainSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: BrainSettings) => void;
}

export function AiBrainSettingsModal({
  open,
  onOpenChange,
  onSaved,
}: AiBrainSettingsModalProps) {
  const [settings, setSettings] = useState<BrainSettings>(DEFAULT_BRAIN_SETTINGS);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kael_brain_settings");
      if (saved) {
        setSettings({ ...DEFAULT_BRAIN_SETTINGS, ...JSON.parse(saved) });
      }
    } catch {
      // ignore
    }
  }, [open]);

  const handleSave = () => {
    try {
      localStorage.setItem("kael_brain_settings", JSON.stringify(settings));
      if (onSaved) onSaved(settings);
      onOpenChange(false);
    } catch (err) {
      console.warn("Settings save error:", err);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: "demo-yuki",
          message: "Merhaba, bağlantı testi!",
          provider: settings.provider,
          apiKey: settings.apiKey.trim(),
          model: settings.model,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      setTestResult({
        success: true,
        message: "Bağlantı başarılı! Yapay zeka beyni sorunsuz yanıt veriyor.",
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Bağlantı kurulamadı. API anahtarını kontrol edin.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-neutral-950/95 border border-white/10 text-white backdrop-blur-2xl rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25">
              <Brain className="size-4" />
            </span>
            <DialogTitle className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Yapay Zeka Beyin Ayarları (LLM Motoru)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-neutral-400">
            Karakterlerin SpicyChat ve Character.AI seviyesinde derin rol yapması için beynini yapılandır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* Motor Seçenekleri */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">
              Kullanılacak Yapay Zeka Motoru:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Ücretsiz Dahili Bulut */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "free", model: "default" })}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  settings.provider === "free"
                    ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/20"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Sparkles className="size-3.5 text-purple-400" />
                    Kael Bulut Motoru
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">
                    ÜCRETSİZ
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Hiçbir anahtar veya kayıt gerektirmez. Hemen kullanmaya başla.
                </p>
              </button>

              {/* 2. Groq Cloud (Ultra Hızlı & Bedava Llama 3) */}
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    provider: "groq",
                    model: "llama-3.3-70b-versatile",
                  })
                }
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  settings.provider === "groq"
                    ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/20"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Zap className="size-3.5 text-amber-400" />
                    Groq Cloud (Llama 3.3)
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">
                    BEDAVA API
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Saniyede 300 kelime hızında Meta Llama 3.3 70B modeli. %100 ücretsizdir.
                </p>
              </button>

              {/* 3. OpenRouter (SpicyChat / Sansürsüz Modeller) */}
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    provider: "openrouter",
                    model: "deepseek/deepseek-chat",
                  })
                }
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  settings.provider === "openrouter"
                    ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/20"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Flame className="size-3.5 text-pink-400" />
                    OpenRouter (SpicyChat)
                  </div>
                  <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[9px]">
                    SANSÜRSÜZ
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  DeepSeek, Mythomax ve Llama modelleri. SpicyChat gibi sınırsız rol yapma.
                </p>
              </button>

              {/* 4. OpenAI (GPT-4o) */}
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    provider: "openai",
                    model: "gpt-4o",
                  })
                }
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  settings.provider === "openai"
                    ? "border-purple-500 bg-purple-950/40 ring-2 ring-purple-500/20"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <Cpu className="size-3.5 text-emerald-400" />
                    OpenAI (GPT-4o)
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[9px]">
                    GPT-4o
                  </Badge>
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Maksimum entelektüel derinlik ve felsefi/akademik yetkinlik.
                </p>
              </button>
            </div>
          </div>

          {/* API Key Girişi (Harici sağlayıcı seçildiyse) */}
          {settings.provider !== "free" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 p-3.5 rounded-xl bg-black/40 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Key className="size-3.5 text-purple-400" />
                  {settings.provider === "groq"
                    ? "Groq Cloud API Anahtarı"
                    : settings.provider === "openrouter"
                    ? "OpenRouter API Anahtarı"
                    : "OpenAI API Anahtarı"}
                </label>

                {settings.provider === "groq" && (
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Ücretsiz Key Al <ExternalLink className="size-2.5" />
                  </a>
                )}

                {settings.provider === "openrouter" && (
                  <a
                    href="https://openrouter.ai/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-pink-400 hover:underline flex items-center gap-1"
                  >
                    OpenRouter Key Al <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>

              <Input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder={
                  settings.provider === "groq"
                    ? "gsk_..."
                    : settings.provider === "openrouter"
                    ? "sk-or-..."
                    : "sk-..."
                }
                className="bg-neutral-900 border-white/10 text-xs font-mono text-white rounded-lg h-9"
              />

              <p className="text-[10px] text-neutral-400">
                Anahtarınız sunucuda tutulmaz, sadece tarayıcınızın yerel hafızasında güvenle saklanır.
              </p>
            </motion.div>
          )}

          {/* Test Sonucu */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success
                  ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                  : "bg-red-950/40 border border-red-500/30 text-red-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              ) : (
                <ShieldAlert className="size-4 shrink-0 text-red-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Alt Butonlar */}
          <div className="pt-2 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="border-white/10 bg-white/[0.03] text-xs text-neutral-300 hover:bg-white/10"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Test Ediliyor...
                  </>
                ) : (
                  "Test Et"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSettings(DEFAULT_BRAIN_SETTINGS);
                  localStorage.setItem("kael_brain_settings", JSON.stringify(DEFAULT_BRAIN_SETTINGS));
                  setTestResult({
                    success: true,
                    message: "Yapay zeka beyni otomatik ve ücretsiz moda sıfırlandı! Artık anahtara gerek yoktur.",
                  });
                }}
                className="text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                title="Tüm anahtarları silip hazır otomatik moda dön"
              >
                ⚡ Otomatiğe Sıfırla
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Kapat
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/30 px-5"
              >
                Ayarları Kaydet
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
