"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Sparkles,
  Check,
  Camera,
  Upload,
  Link2,
  ZoomIn,
  MoveVertical,
  Sliders,
  Palette,
  Crown,
  Shield,
  Flame,
  Zap,
  Heart,
  Smile,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface UserProfileData {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  avatar_scale?: number;
  avatar_offset_y?: number;
  avatar_frame?: string;
  avatar_filter?: string;
  title?: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  username: "maceraci",
  display_name: "Gezgin",
  bio: "Yapay zeka evrenlerini ve rol yapma maceralarını keşfeden bir yolcu.",
  avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
  avatar_scale: 1,
  avatar_offset_y: 50,
  avatar_frame: "neon-purple",
  avatar_filter: "none",
  title: "Gezgin",
};

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: (profile: UserProfileData) => void;
}

// Preset Categories with high quality portraits
const PRESET_CATEGORIES = [
  {
    id: "anime",
    name: "🌸 Anime",
    presets: [
      {
        name: "Yuki Tarzı Anime Kız",
        url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Kaito Karizmatik Anime Çocuk",
        url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Pastel Sakura Büyücüsü",
        url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Mistik Manga Kahramanı",
        url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "cyberpunk",
    name: "⚡ Cyberpunk",
    presets: [
      {
        name: "Neon Hacker",
        url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Sentetik Android",
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Siber Gezgin",
        url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Kuantum Operatörü",
        url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "fantasy",
    name: "🛡️ Epik & Fantazi",
    presets: [
      {
        name: "Gölge Şövalyesi",
        url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Büyülü Gezgin",
        url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Karanlık Elf",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Işık Muhafızı",
        url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    id: "anthro",
    name: "🐾 Furry & Karakter",
    presets: [
      {
        name: "Karizmatik Kaplan Dedektif",
        url: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Kurt Muhafız",
        url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Mistik Kızıl Tilki",
        url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400&auto=format&fit=crop&q=80",
      },
      {
        name: "Görkemli Aslan Savaşçı",
        url: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=400&auto=format&fit=crop&q=80",
      },
    ],
  },
];

// Glowing Frame Ring Styles
const AVATAR_FRAMES = [
  { id: "default", name: "Sade", icon: Shield, class: "border-white/20" },
  {
    id: "neon-purple",
    name: "Siber Mor",
    icon: Sparkles,
    class: "border-purple-400 ring-4 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.6)]",
  },
  {
    id: "gold-vip",
    name: "Altın VIP",
    icon: Crown,
    class: "border-amber-400 ring-4 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.6)]",
  },
  {
    id: "sakura",
    name: "Sakura",
    icon: Heart,
    class: "border-pink-400 ring-4 ring-pink-400/50 shadow-[0_0_20px_rgba(244,114,182,0.6)]",
  },
  {
    id: "fire",
    name: "Ejder Ateşi",
    icon: Flame,
    class: "border-orange-500 ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.7)]",
  },
  {
    id: "cyan",
    name: "Kuantum",
    icon: Zap,
    class: "border-cyan-400 ring-4 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.6)]",
  },
];

// Color & Contrast Filters
const AVATAR_FILTERS = [
  { id: "none", name: "Orijinal", style: "none" },
  { id: "vibrant", name: "Canlı", style: "saturate(1.4) contrast(1.1)" },
  { id: "cyber", name: "Cyberpunk", style: "saturate(1.5) hue-rotate(290deg) contrast(1.15)" },
  { id: "warm", name: "Sıcak Sinematik", style: "sepia(0.25) saturate(1.3) brightness(1.05)" },
  { id: "bw", name: "Kara Film", style: "grayscale(1) contrast(1.2)" },
];

const QUICK_TITLES = [
  "Gezgin",
  "Senpai",
  "Cyber Dedektif",
  "Büyücü",
  "Gölge Savaşçısı",
  "Yolcu",
  "Kodlayıcı",
];

export function ProfileModal({ open, onOpenChange, onProfileUpdated }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [activeCategory, setActiveCategory] = useState("anime");
  const [urlInput, setUrlInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const sp = localStorage.getItem("kael_user_profile");
      const sa = localStorage.getItem("kael_auth_session");
      let base: UserProfileData = { ...DEFAULT_PROFILE };

      if (sp) {
        base = { ...base, ...JSON.parse(sp) };
      } else if (sa) {
        const parsed = JSON.parse(sa);
        base = {
          ...base,
          username: parsed.username || base.username,
          display_name: parsed.displayName || base.display_name,
          bio: parsed.bio || base.bio,
          avatar_url: parsed.avatarUrl || base.avatar_url,
        };
      }
      setProfile(base);
    } catch {
      // ignore
    }
  }, [open]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (result) {
        setProfile((prev) => ({ ...prev, avatar_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL submit
  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setProfile((prev) => ({ ...prev, avatar_url: urlInput.trim() }));
      setUrlInput("");
    }
  };

  const handleSave = () => {
    try {
      // 1. Save to kael_user_profile
      localStorage.setItem("kael_user_profile", JSON.stringify(profile));

      // 2. Synchronize with kael_auth_session
      try {
        const rawSession = localStorage.getItem("kael_auth_session");
        const session = rawSession ? JSON.parse(rawSession) : {};
        const updatedSession = {
          ...session,
          displayName: profile.display_name,
          username: profile.username,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
        };
        localStorage.setItem("kael_auth_session", JSON.stringify(updatedSession));
      } catch {
        // ignore
      }

      // 3. Dispatch global profile updated event for chat view & components
      window.dispatchEvent(
        new CustomEvent("kael_profile_updated", { detail: profile })
      );

      setIsSaved(true);
      if (onProfileUpdated) onProfileUpdated(profile);
      setTimeout(() => {
        setIsSaved(false);
        onOpenChange(false);
      }, 700);
    } catch (err) {
      console.error("Profil kaydedilemedi:", err);
    }
  };

  const currentFrame =
    AVATAR_FRAMES.find((f) => f.id === (profile.avatar_frame || "neon-purple")) ||
    AVATAR_FRAMES[1];

  const currentFilter =
    AVATAR_FILTERS.find((f) => f.id === (profile.avatar_filter || "none")) ||
    AVATAR_FILTERS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-neutral-950 border-white/10 text-white p-6 rounded-3xl shadow-2xl no-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Camera className="size-5" />
            </span>
            Avatar Stüdyosu & Profil Düzenleyici
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Fotoğrafını yükle, yakınlaştır, çerçeve & filtre efektleri ekle ve yapay zeka karakterlerinin seni tanımasını sağla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 1. INTERACTIVE AVATAR STUDIO & LIVE PREVIEW */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-md">
            {/* Live Cropped & Styled Avatar Preview */}
            <div className="relative shrink-0 flex flex-col items-center gap-2">
              <div
                className={`size-28 sm:size-32 rounded-full overflow-hidden border-4 transition-all duration-300 relative bg-neutral-950 shadow-2xl ${currentFrame.class}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url || DEFAULT_PROFILE.avatar_url}
                  alt={profile.display_name}
                  style={{
                    transform: `scale(${profile.avatar_scale || 1})`,
                    objectPosition: `center ${profile.avatar_offset_y ?? 50}%`,
                    filter: currentFilter.style,
                  }}
                  className="w-full h-full object-cover transition-transform duration-150"
                />
              </div>
              <span className="text-[10px] font-mono text-purple-300">
                Canlı Önizleme
              </span>
            </div>

            {/* Quick Upload & Adjust Buttons */}
            <div className="flex-1 space-y-3 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 h-8"
                >
                  <Upload className="size-3.5" />
                  <span>Fotoğraf Yükle</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <span className="text-neutral-500 text-xs">veya</span>

                {/* URL Input */}
                <div className="flex items-center gap-1 flex-1 min-w-[170px]">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Resim URL'si..."
                    className="bg-white/[0.04] border-white/10 text-white text-xs h-8 rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleApplyUrl}
                    className="border-white/10 text-xs h-8 px-2.5 rounded-xl hover:bg-white/10"
                  >
                    <Link2 className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Zoom & Y-Offset Controls */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="size-3 text-purple-400" /> Yakınlaştırma (Zoom)
                  </span>
                  <span className="font-mono text-purple-300">
                    {Math.round((profile.avatar_scale || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={profile.avatar_scale || 1}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      avatar_scale: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-purple-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                />

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MoveVertical className="size-3 text-cyan-400" /> Dikey Konumlandırma
                  </span>
                  <span className="font-mono text-cyan-300">
                    %{profile.avatar_offset_y ?? 50}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="2"
                  value={profile.avatar_offset_y ?? 50}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      avatar_offset_y: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* 2. AVATAR GLOW FRAMES & RINGS */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>Avatar Çerçevesi & Aura Işıltısı</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVATAR_FRAMES.map((f) => {
                const Icon = f.icon;
                const isSelected = (profile.avatar_frame || "neon-purple") === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatar_frame: f.id }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-purple-950/60 border-purple-400 text-purple-200 shadow-md shadow-purple-500/20"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 text-neutral-400"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. COLOR & CONTRAST FILTERS */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Palette className="size-3.5 text-pink-400" />
              <span>Görsel Filtre Efekti</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {AVATAR_FILTERS.map((filter) => {
                const isSelected = (profile.avatar_filter || "none") === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, avatar_filter: filter.id }))}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-pink-600/30 border-pink-400 text-pink-200 shadow-sm"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 text-neutral-400"
                    }`}
                  >
                    {filter.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PRESET CHARACTERS GALLERY */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Smile className="size-3.5 text-purple-400" />
                <span>Hazır Karakter Portreleri Galerisi</span>
              </label>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                      : "bg-white/[0.03] text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {PRESET_CATEGORIES.find((c) => c.id === activeCategory)?.presets.map(
                (preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        avatar_url: preset.url,
                        avatar_scale: 1,
                        avatar_offset_y: 50,
                      }))
                    }
                    className={`group/card relative rounded-2xl overflow-hidden border-2 transition-all p-1.5 text-left cursor-pointer ${
                      profile.avatar_url === preset.url
                        ? "border-purple-400 ring-2 ring-purple-500/50 bg-purple-950/40"
                        : "border-white/10 hover:border-purple-500/40 bg-neutral-900/60"
                    }`}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-neutral-950 relative mb-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-neutral-200 block truncate leading-tight">
                      {preset.name}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* 5. USER IDENTITY & PERSONA DETAILS */}
          <div className="space-y-3.5 pt-2 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Görünen İsim (Display Name)
                </label>
                <Input
                  value={profile.display_name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, display_name: e.target.value }))
                  }
                  placeholder="Örn: Eren, Kael, Alex..."
                  className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Kullanıcı Adı (@etiket)
                </label>
                <Input
                  value={profile.username}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      username: e.target.value.replace(/^@/, "").toLowerCase(),
                    }))
                  }
                  placeholder="eren_99"
                  className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Title / Persona Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Ünvan & Rol Tarzı</span>
                <span className="text-[10px] text-neutral-500">
                  Karakterlerin sana hitap şeklini belirler
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {QUICK_TITLES.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, title: t }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                      (profile.title || "Gezgin") === t
                        ? "bg-purple-600/40 border-purple-400 text-purple-200"
                        : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input
                value={profile.title || ""}
                onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))}
                placeholder="Özel ünvan gir (Örn: Sırdaş, Sensei, Baş Dedektif...)"
                className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs h-9"
              />
            </div>

            {/* Bio & Roleplay style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Hakkında & Karakterlerin Seni Nasıl Tanıyacağı (Biyografi)
              </label>
              <Textarea
                value={profile.bio}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, bio: e.target.value }))
                }
                placeholder="Karakterlerin senin hakkında bilmesini istediğin kişilik özellikleri, geçmişin veya rol tarzın..."
                className="bg-white/[0.04] border-white/10 text-white rounded-xl text-xs min-h-[75px] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-white/[0.03] text-neutral-300 text-xs rounded-xl"
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/30 px-5"
            >
              {isSaved ? (
                <>
                  <Check className="size-4 mr-1 text-emerald-400" /> Kaydedildi & Uygulandı!
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-1" /> Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
