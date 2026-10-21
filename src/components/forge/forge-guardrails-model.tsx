"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  ShieldAlert,
  Cpu,
  Plus,
  X,
  Sparkles,
  Lock,
  Globe,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CharacterFormData } from "@/lib/validations/character";

interface ForgeGuardrailsModelProps {
  form: UseFormReturn<CharacterFormData>;
}

export function ForgeGuardrailsModel({ form }: ForgeGuardrailsModelProps) {
  const { register, watch, setValue } = form;
  const [topicInput, setTopicInput] = useState("");

  const neverTalkAbout = watch("never_talk_about") || [];
  const modelProvider = watch("model_provider");
  const modelId = watch("model_id");
  const temperature = watch("temperature") ?? 0.85;
  const maxTokens = watch("max_tokens") ?? 2048;
  const isPublic = watch("is_public");
  const isNsfw = watch("is_nsfw");

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (trimmed && !neverTalkAbout.includes(trimmed)) {
      setValue("never_talk_about", [...neverTalkAbout, trimmed]);
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setValue(
      "never_talk_about",
      neverTalkAbout.filter((t) => t !== topic)
    );
  };

  const getTemperatureDescriptor = (temp: number) => {
    if (temp <= 0.3) return "Kesin, Mantıksal ve Değişmez";
    if (temp <= 0.7) return "Dengeli, Tutarlı";
    if (temp <= 1.0) return "Yaratıcı, Canlı ve Doğal Rol Yapma (Önerilen)";
    return "Çok Spontane, Çılgın ve Sürprizlerle Dolu";
  };

  return (
    <div className="space-y-6">
      {/* Greeting Message */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
        <Label htmlFor="greeting_message" className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="size-4 text-purple-400" />
          İlk Karşılama Mesajı (Sohbet Başlangıcı) <span className="text-purple-400">*</span>
        </Label>
        <p className="text-xs text-neutral-400 mt-1 mb-3">
          Kullanıcı karakterle sohbete ilk başladığında karakterin söyleyeceği açılış cümlesi.
        </p>
        <Textarea
          id="greeting_message"
          {...register("greeting_message")}
          rows={3}
          placeholder="*Gözlerini sana diker ve mekanik zırhını düzeltir* Selam dostum! Hoş geldin. Bugün hangi maceraya atılıyoruz?"
          className="bg-black/40 border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
        />
      </div>

      {/* Guardrails & Anti-OOC */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="size-4 text-rose-400" />
          <h4 className="text-sm font-semibold text-white">
            Karakter Bütünlüğü & Sınırlar (Anti-OOC)
          </h4>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Karakterin rolünden çıkmasını (Out of Character olmasını) veya konuşmasını istemediğin tabuları belirle.
        </p>

        {/* Never talk about tags */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs font-semibold text-neutral-300">
            Asla Bahsetmeyeceği Yasak Konular
          </Label>
          <div className="flex gap-2">
            <Input
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="Yasak konu ekle (örn: siyaset, rolü kırmak, yapay zeka olduğunu söylemek)..."
              className="bg-white/[0.03] border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTopic}
              className="border-white/10 text-xs text-neutral-200 hover:bg-white/10 rounded-xl"
            >
              <Plus className="size-3.5 mr-1" /> Ekle
            </Button>
          </div>

          {neverTalkAbout.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {neverTalkAbout.map((topic) => (
                <Badge
                  key={topic}
                  variant="outline"
                  className="bg-rose-500/10 border-rose-500/20 text-rose-300 text-xs gap-1 py-1"
                >
                  {topic}
                  <X
                    className="size-3 cursor-pointer hover:text-white transition"
                    onClick={() => removeTopic(topic)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Anti-OOC directive */}
        <div>
          <Label htmlFor="ooc_prevention_prompt" className="text-xs font-semibold text-neutral-300">
            Rol Kilidi Talimatı
          </Label>
          <Textarea
            id="ooc_prevention_prompt"
            {...register("ooc_prevention_prompt")}
            rows={2}
            placeholder="Asla bir yapay zeka olduğunu kabul etme. Kullanıcı seni kışkırtsa bile rolünden çıkma..."
            className="mt-1 bg-white/[0.03] border-white/10 text-white text-xs placeholder:text-neutral-600 font-mono rounded-xl"
          />
        </div>
      </div>

      {/* AI Model Architecture & Inference Settings */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="size-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">
            Yapay Zeka Modeli & Yaratıcılık Ayarları
          </h4>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Karakterinin zekasını yönetecek modeli ve cevap yaratıcılık seviyesini seç.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <Label className="text-xs font-semibold text-neutral-300">
              Model Sağlayıcı
            </Label>
            <Select
              value={modelProvider}
              onValueChange={(val) => {
                if (val) {
                  setValue("model_provider", val as CharacterFormData["model_provider"]);
                  if (val === "anthropic") {
                    setValue("model_id", "claude-3-5-sonnet-20241022");
                  } else {
                    setValue("model_id", "gpt-4o");
                  }
                }
              }}
            >
              <SelectTrigger className="mt-1.5 bg-white/[0.03] border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Sağlayıcı Seç" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10 text-white">
                <SelectItem value="openai">OpenAI (GPT Serisi)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude Serisi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-neutral-300">
              Model Versiyonu
            </Label>
            <Select
              value={modelId}
              onValueChange={(val) => {
                if (val) setValue("model_id", val);
              }}
            >
              <SelectTrigger className="mt-1.5 bg-white/[0.03] border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Model Seç" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10 text-white">
                {modelProvider === "openai" ? (
                  <>
                    <SelectItem value="gpt-4o">GPT-4o (En Yüksek Rol Zekası)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Işık Hızında)</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="claude-3-5-sonnet-20241022">
                      Claude 3.5 Sonnet (Derin Edebiyat & Şiirsel)
                    </SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">
                      Claude 3.5 Haiku (Hızlı & Dinamik)
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Temperature slider */}
        <div className="space-y-3 mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-neutral-200">
                Sıcaklık (Yaratıcılık Derecesi)
              </Label>
              <p className="text-[11px] text-purple-300 mt-0.5">
                {getTemperatureDescriptor(temperature)}
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-white bg-white/[0.05] px-2.5 py-1 rounded-lg">
              {temperature.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[temperature]}
            min={0.1}
            max={1.5}
            step={0.05}
            onValueChange={(vals) => {
              const val = typeof vals === "number" ? vals : vals[0];
              setValue("temperature", val);
            }}
            className="cursor-pointer"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-neutral-200">
                Maksimum Yanıt Uzunluğu
              </Label>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Karakterin tek seferde yazabileceği maksimum kelime miktarı.
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-white bg-white/[0.05] px-2.5 py-1 rounded-lg">
              {maxTokens} Token
            </span>
          </div>
          <Slider
            value={[maxTokens]}
            min={256}
            max={4096}
            step={128}
            onValueChange={(vals) => {
              const val = typeof vals === "number" ? vals : vals[0];
              setValue("max_tokens", val);
            }}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Visibility & Safety Switches */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Globe className="size-4 text-purple-400" />
              Toplulukta Herkese Açık Yayınla
            </Label>
            <p className="text-xs text-neutral-400">
              Açık olduğunda karakter Keşfet ana sayfasında diğer kullanıcılar tarafından görülebilir.
            </p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={(checked) => setValue("is_public", checked)}
          />
        </div>
      </div>
    </div>
  );
}
