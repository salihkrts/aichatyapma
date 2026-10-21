"use client";

import { Sparkles, MessageSquare, Heart, Shield, Cpu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CharacterFormData } from "@/lib/validations/character";

interface ForgePreviewCardProps {
  data: CharacterFormData;
}

export function ForgePreviewCard({ data }: ForgePreviewCardProps) {
  const getInitials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "KL";

  return (
    <div className="sticky top-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-2xl transition-all">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-purple-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
            Canlı Karakter Önizlemesi
          </span>
        </div>
        <Badge
          variant="outline"
          className="border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] uppercase font-mono"
        >
          {data.category}
        </Badge>
      </div>

      {/* Avatar & Header */}
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 opacity-60 blur-md group-hover:opacity-90 transition duration-500" />
          <Avatar className="relative size-24 border-2 border-white/20 shadow-xl">
            <AvatarImage
              src={data.avatar_url || undefined}
              alt={data.name || "Karakter"}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-neutral-800 to-neutral-950 text-xl font-bold text-white">
              {getInitials(data.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        <h3 className="mt-4 text-xl font-bold tracking-tight text-white">
          {data.name || "İsimsiz Karakter"}
        </h3>
        <p className="mt-1 text-xs text-neutral-400 line-clamp-2 max-w-[240px]">
          {data.tagline || "Karakterinin sloganı veya kısa tanımı..."}
        </p>

        {/* Stats Row */}
        <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5 text-blue-400" />
            0 Sohbet
          </span>
          <span className="flex items-center gap-1">
            <Heart className="size-3.5 text-pink-400" />
            0 Beğeni
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="size-3.5 text-emerald-400" />
            GPT-4o
          </span>
        </div>
      </div>

      {/* Psychology Radar / Trait Meters */}
      <div className="mt-6 space-y-2.5 rounded-xl bg-white/[0.03] p-4 border border-white/5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 flex justify-between">
          <span>Kişilik Profili</span>
          <span className="text-purple-400 font-mono">Zeka Matrisi</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Empati</span>
              <span className="font-mono text-white">%{data.trait_empathy}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${data.trait_empathy}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Mizah</span>
              <span className="font-mono text-white">%{data.trait_humor}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${data.trait_humor}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Sertlik</span>
              <span className="font-mono text-white">%{data.trait_aggression}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-300"
                style={{ width: `${data.trait_aggression}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Yaratıcılık</span>
              <span className="font-mono text-white">%{data.trait_creativity}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-300"
                style={{ width: `${data.trait_creativity}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Greeting Preview Bubble */}
      <div className="mt-5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2 block">
          İlk Açılış Cümlesi
        </span>
        <div className="relative rounded-xl bg-purple-950/20 border border-purple-500/20 p-3.5 text-xs text-neutral-200 leading-relaxed italic">
          <p className="line-clamp-3">
            &ldquo;{data.greeting_message || "Selam dostum..."}&rdquo;
          </p>
        </div>
      </div>

      {/* Guardrails summary */}
      {data.never_talk_about && data.never_talk_about.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Shield className="size-3 text-emerald-400" />
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
            Yasak Konular:
          </span>
          {data.never_talk_about.map((topic, i) => (
            <span
              key={i}
              className="text-[10px] bg-red-500/10 text-red-300 border border-red-500/20 px-2 py-0.5 rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
