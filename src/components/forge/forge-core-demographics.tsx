"use client";

import { useState, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { Upload, Volume2, X, Plus, Play, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { CharacterFormData } from "@/lib/validations/character";
import { characterCategories } from "@/lib/validations/character";
import {
  CHARACTER_VOICES,
  speakWithNeuralVoice,
  stopNeuralVoice,
} from "@/lib/voice/voices";

interface ForgeCoreDemographicsProps {
  form: UseFormReturn<CharacterFormData>;
}

const CATEGORY_LABELS: Record<string, string> = {
  anime: "Anime & Manga",
  fictional: "Fantezi & Furry",
  general: "Popüler & Gerçekçi",
  rpg_gamemasters: "RPG & Macera Yöneticisi",
  mentors: "Bilge & Rehber",
  historical: "Tarihi Figür",
  therapists: "Dert Ortağı & Terapi",
  assistants: "Akıllı Asistan",
};

export function ForgeCoreDemographics({ form }: ForgeCoreDemographicsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const avatarUrl = watch("avatar_url");
  const tags = watch("tags") || [];
  const selectedVoice = watch("voice_id") || "anime-girl-yuki";
  const selectedCategory = watch("category");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/characters/avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.avatarUrl) {
        setValue("avatar_url", json.avatarUrl, { shouldValidate: true });
      } else {
        alert(json.error || "Görsel yüklenemedi");
      }
    } catch (err) {
      console.error("Görsel yükleme hatası:", err);
      alert("Görsel yüklenirken bir sorun oluştu");
    } finally {
      setIsUploading(false);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setValue("tags", [...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tagToRemove)
    );
  };

  return (
    <div className="space-y-6">
      {/* Avatar & Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Avatar Upload Column */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md text-center">
          <Label className="text-sm font-semibold mb-3 text-neutral-300">
            Karakter Avatarı
          </Label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative size-36 rounded-2xl border-2 border-dashed border-purple-500/40 hover:border-purple-500/80 bg-neutral-900/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center text-neutral-400 group-hover:text-purple-300 transition">
                <Upload className="size-7 mb-1.5" />
                <span className="text-[11px] font-medium">Görsel Seç</span>
                <span className="text-[9px] text-neutral-500">JPG, PNG, WEBP</span>
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs text-purple-300 font-mono">
                Yükleniyor...
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="mt-3 w-full">
            <Label className="text-[11px] text-neutral-400 mb-1 block">
              veya Görsel Bağlantısı (URL)
            </Label>
            <Input
              {...register("avatar_url")}
              placeholder="https://..."
              className="text-xs h-8 bg-white/[0.03] border-white/10 text-white"
            />
          </div>
        </div>

        {/* Identity Information Column */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold text-neutral-200">
              Karakter İsmi <span className="text-purple-400">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Örn: Demir Pençe, Yuki, Kael..."
              className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tagline" className="text-sm font-semibold text-neutral-200">
              Karakter Sloganı / Kısa Başlık
            </Label>
            <Input
              id="tagline"
              {...register("tagline")}
              placeholder="Örn: Mekanik zırhlı cesur bir orman savaşçısı"
              className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
            />
            {errors.tagline && (
              <p className="mt-1 text-xs text-red-400">{errors.tagline.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-neutral-200">
                Kategori
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  if (val) setValue("category", val as CharacterFormData["category"]);
                }}
              >
                <SelectTrigger className="mt-1.5 bg-white/[0.03] border-white/10 text-white rounded-xl">
                  <SelectValue placeholder="Kategori Seç" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                  {characterCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                <Volume2 className="size-4 text-purple-400" />
                Ses Tonu (14 Ücretsiz Neural Ses)
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Select
                  value={selectedVoice || "anime-girl-yuki"}
                  onValueChange={(val) => {
                    if (val) setValue("voice_id", val);
                  }}
                >
                  <SelectTrigger className="flex-1 bg-white/[0.03] border-white/10 text-white rounded-xl">
                    <SelectValue placeholder="Ses Tonu Seç" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10 text-white max-h-72">
                    {CHARACTER_VOICES.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isPreviewingVoice) {
                      stopNeuralVoice();
                      setIsPreviewingVoice(false);
                      return;
                    }
                    const found =
                      CHARACTER_VOICES.find((v) => v.id === selectedVoice) ||
                      CHARACTER_VOICES[0];
                    setIsPreviewingVoice(true);
                    speakWithNeuralVoice({
                      text: found.sampleText,
                      voiceId: found.id,
                      onEnd: () => setIsPreviewingVoice(false),
                    });
                  }}
                  title="Seçili sesi dinle"
                  className="h-10 px-3 border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/50 text-purple-200 rounded-xl shrink-0"
                >
                  {isPreviewingVoice ? (
                    <>
                      <Square className="size-3.5 mr-1 fill-current" /> Durdur
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 mr-1 fill-current" /> Dinle
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-semibold text-neutral-200">
          Karakter Hakkında Detaylı Bilgi
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={3}
          placeholder="Karakterinin genel hikayesi, nereden geldiği, hedefleri ve nasıl davrandığı..."
          className="mt-1.5 bg-white/[0.03] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
        )}
      </div>

      {/* Tags Input */}
      <div>
        <Label className="text-sm font-semibold text-neutral-200">
          Etiketler (Karakteri Keşifte Öne Çıkarır)
        </Label>
        <div className="mt-1.5 flex items-center gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Örn: robot, ayı, savaşçı, anime (Enter'a bas)"
            className="bg-white/[0.03] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
          />
          <Button
            type="button"
            onClick={addTag}
            variant="outline"
            className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 rounded-xl"
          >
            <Plus className="size-4 mr-1" /> Ekle
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1 text-xs rounded-full flex items-center gap-1.5"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-white transition"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
