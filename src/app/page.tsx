"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  Plus,
  MessageSquare,
  Compass,
  Hammer,
  Flame,
  ArrowRight,
  Heart,
  Cpu,
  Bookmark,
  Trash2,
  Wand2,
  Brain,
  Globe,
  Lock,
  Users,
  UserCircle,
  ShieldCheck,
  Menu,
  X,
  LogIn,
  Coins,
  Crown,
  ShoppingBag,
  Megaphone,
  BookOpen,
  Bell,
  Camera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { ChatView } from "@/components/chat/chat-view";
import { GroupChatView } from "@/components/group/group-chat-view";
import { ForgeView } from "@/components/forge/forge-view";
import { ProfileModal, type UserProfileData } from "@/components/profile-modal";
import { AiBrainSettingsModal } from "@/components/chat/ai-brain-settings-modal";
import { UserProfile } from "@/components/profile/UserProfile";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { StorePricingView } from "@/components/store/store-pricing-view";
import { AdminPanelView } from "@/components/admin/admin-panel-view";
import { VisualFxOverlay } from "@/components/fx/visual-fx-overlay";
import { QuestsStreakModal } from "@/components/quests/quests-streak-modal";
import { CharacterLivePing } from "@/components/notifications/character-live-ping";
import { VisualNovelView } from "@/components/vn/visual-novel-view";
import {
  ensureSessionUserInPlatform,
  getSystemConfig,
  isUserAuthorizedAdmin,
  SEEDED_USERS,
  type PlatformUserRecord,
  type SystemGlobalConfig,
} from "@/lib/economy/economy-service";
import {
  createInitialGuestSession,
  filterBotsByAgeGateAndBlockList,
  type AuthSessionPayload,
  type UserPersonaItem,
} from "@/lib/social/auth-age-friendship-service";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import type { CharacterWithCreator } from "@/types/database";

type ActiveTab =
  | "explore"
  | "chat"
  | "vn"
  | "groups"
  | "forge"
  | "store"
  | "profile"
  | "admin";

const CATEGORY_MAP: Record<string, string> = {
  all: "🌟 Tüm Karakterler",
  female: "👩 Kız & Kadın",
  male: "👨 Erkek",
  fictional: "🐻 Furry & Fursona",
  anime: "🌸 Anime & Tsundere",
  general: "🤖 Robotik & Popüler",
  rpg_gamemasters: "🎲 RPG & Macera",
  mentors: "🛋️ Psikolog & Rehber",
};

function UnifiedAppContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>("explore");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [characters, setCharacters] = useState<CharacterWithCreator[]>(FALLBACK_PERSONAS);
  const [savedCharacters, setSavedCharacters] = useState<CharacterWithCreator[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isBrainModalOpen, setIsBrainModalOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);
  const [livePingEnabled, setLivePingEnabled] = useState(true);
  const [manualPingTrigger, setManualPingTrigger] = useState(0);
  const [pingSettingsOpen, setPingSettingsOpen] = useState(false);
  const [pendingVoiceCall, setPendingVoiceCall] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  // Auth / Guest Session & Multi-Persona State
  // Varsayılan: 100 deneme jetonlu Misafir Oturumu (Her yeni ziyaretçi misafir olarak başlar)
  const [authSession, setAuthSession] = useState<AuthSessionPayload>(() => {
    return createInitialGuestSession();
  });

  const [currentUserEconomy, setCurrentUserEconomy] = useState<PlatformUserRecord>(
    () => ensureSessionUserInPlatform(createInitialGuestSession())
  );
  const [sysConfig, setSysConfig] = useState<SystemGlobalConfig>(() => getSystemConfig());

  const [personas, setPersonas] = useState<UserPersonaItem[]>([
    {
      id: "default-persona-1",
      name: "Kael Gezgini",
      backstory: "Gece sokaklarında sırları araştıran, soğukkanlı, zeki ve sadık bir maceracı.",
      avatarUrl: "/avatars/kaito.jpg",
      isDefault: true,
    },
  ]);

  const supabase = createClient();

  const handleSwitchToKaelAdmin = () => {
    const kaelSession: AuthSessionPayload = {
      userId: "user-kael-founder",
      username: "kael",
      displayName: "Kael (Kurucu & Baş Yönetici)",
      email: "kael@kael.ai",
      birthDate: "2000-01-01",
      isGuest: false,
      isAdult: true,
      nsfwEnabled: true,
      avatarUrl: "/avatars/kaito.jpg",
      coverUrl:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1500&auto=format&fit=crop&q=80",
      bio: "👑 Kael-AI Kurucu & Baş Yönetici Hesabı",
      joinedAt: "2026-01-01T00:00:00.000Z",
    };
    setAuthSession(kaelSession);
    try {
      localStorage.setItem("kael_auth_session", JSON.stringify(kaelSession));
    } catch {
      // ignore
    }
    const ensured = ensureSessionUserInPlatform(kaelSession);
    setCurrentUserEconomy(ensured);
    setActiveTab("admin");
  };

  const loadSavedCharacters = useCallback(() => {
    try {
      const stored = localStorage.getItem("kael_saved_characters");
      if (stored) {
        setSavedCharacters(JSON.parse(stored));
      }
      const storedProfile = localStorage.getItem("kael_user_profile");
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      }
      const storedAuth = localStorage.getItem("kael_auth_session");
      if (storedAuth) {
        const parsedAuth: AuthSessionPayload = JSON.parse(storedAuth);
        setAuthSession(parsedAuth);
        setCurrentUserEconomy(ensureSessionUserInPlatform(parsedAuth));
      } else {
        const guestSession = createInitialGuestSession();
        localStorage.setItem("kael_auth_session", JSON.stringify(guestSession));
        setAuthSession(guestSession);
        setCurrentUserEconomy(ensureSessionUserInPlatform(guestSession));
      }
      setSysConfig(getSystemConfig());

      const storedPersonas = localStorage.getItem("kael_user_personas");
      if (storedPersonas) {
        const parsedP = JSON.parse(storedPersonas);
        if (Array.isArray(parsedP) && parsedP.length > 0) {
          setPersonas(parsedP);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSavedCharacters();
    const syncHandler = () => {
      setSysConfig(getSystemConfig());
      try {
        const raw = localStorage.getItem("kael_auth_session");
        if (raw) {
          const s = JSON.parse(raw);
          setCurrentUserEconomy(ensureSessionUserInPlatform(s));
        }
      } catch {
        // ignore
      }
    };
    const openOnboardingHandler = () => {
      setIsOnboardingOpen(true);
    };
    window.addEventListener("kael_economy_updated", syncHandler);
    window.addEventListener("kael_profile_updated", loadSavedCharacters);
    window.addEventListener("kael_open_onboarding", openOnboardingHandler);
    return () => {
      window.removeEventListener("kael_economy_updated", syncHandler);
      window.removeEventListener("kael_profile_updated", loadSavedCharacters);
      window.removeEventListener("kael_open_onboarding", openOnboardingHandler);
    };
  }, [loadSavedCharacters]);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as ActiveTab | null;
    const charParam = searchParams.get("characterId");
    const chatParam = searchParams.get("chatId");

    if (charParam || chatParam) {
      if (charParam) setSelectedCharacterId(charParam);
      if (chatParam) setSelectedChatId(chatParam);
      setActiveTab("chat");
    } else if (
      tabParam &&
      ["explore", "chat", "vn", "groups", "forge", "store", "profile", "admin"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadCharacters() {
      try {
        const { data, error } = await supabase
          .from("characters")
          .select("*, profiles!characters_creator_id_fkey(username, display_name, avatar_url)")
          .eq("is_public", true)
          .order("likes_count", { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          const dbChars = data as unknown as CharacterWithCreator[];
          setCharacters([
            ...FALLBACK_PERSONAS,
            ...dbChars.filter((c) => !c.id.startsWith("demo-")),
          ]);
        }
      } catch (err) {
        console.warn("Fallback to seeded personas:", err);
      }
    }

    loadCharacters();
  }, [supabase]);

  const handleStartChatWithCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setSelectedChatId(null);
    setActiveTab("chat");
  };

  const handleForgeSuccess = (newCharacterId: string) => {
    loadSavedCharacters();
    setSelectedCharacterId(newCharacterId);
    setSelectedChatId(null);
    setActiveTab("chat");
  };

  const handleDeleteSavedCharacter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const updated = savedCharacters.filter((c) => c.id !== id);
      setSavedCharacters(updated);
      localStorage.setItem("kael_saved_characters", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleTogglePublishCharacter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const updated = savedCharacters.map((c) => {
        if (c.id === id) {
          const nextState = c.is_public === false ? true : false;
          return { ...c, is_public: nextState };
        }
        return c;
      });
      setSavedCharacters(updated);
      localStorage.setItem("kael_saved_characters", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Merge published user characters into the public Explore feed!
  const publishedUserChars = savedCharacters.filter((c) => c.is_public !== false);
  const allExploreCharactersRaw: CharacterWithCreator[] = [
    ...publishedUserChars,
    ...characters.filter((c) => !publishedUserChars.some((u) => u.id === c.id)),
  ];

  // Enforce Age-Gate & NSFW Guard on Explore feed
  const allExploreCharacters = filterBotsByAgeGateAndBlockList(
    allExploreCharactersRaw,
    authSession
  );

  const handleToggleBotPublicById = (id: string) => {
    try {
      const updated = savedCharacters.map((c) => {
        if (c.id === id) {
          const nextState = c.is_public === false ? true : false;
          return { ...c, is_public: nextState };
        }
        return c;
      });
      setSavedCharacters(updated);
      localStorage.setItem("kael_saved_characters", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const filteredCharacters = allExploreCharacters.filter((c) => {
    const tags = Array.isArray(c.tags) ? c.tags.map((t) => t.toLowerCase()) : [];
    let matchesCategory = false;

    if (categoryFilter === "all") {
      matchesCategory = true;
    } else if (categoryFilter === "female") {
      matchesCategory =
        tags.includes("kız") ||
        tags.includes("kadın") ||
        tags.includes("kurt-kız") ||
        c.name.toLowerCase().includes("kız");
    } else if (categoryFilter === "male") {
      matchesCategory =
        tags.includes("erkek") ||
        tags.includes("komiser") ||
        tags.includes("profesör") ||
        tags.includes("korsan");
    } else {
      matchesCategory = c.category === categoryFilter;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.tagline || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q) ||
      tags.some((t) => t.includes(q));

    return matchesCategory && matchesSearch;
  });

  const featured = FALLBACK_PERSONAS[0];
  const activePersona = personas.find((p) => p.isDefault) || personas[0];
  const isViewerAdmin = isUserAuthorizedAdmin(authSession.username);

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-purple-500 selection:text-white flex flex-col">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 size-[650px] rounded-full bg-purple-900/15 blur-[160px]" />
        <div className="absolute top-1/2 -right-32 size-[550px] rounded-full bg-blue-900/15 blur-[150px]" />
      </div>

      {/* Global Announcement Banner (Controlled from Admin Panel) */}
      {sysConfig.announcementActive && sysConfig.announcementBanner && (
        <div className="relative z-40 bg-gradient-to-r from-purple-950/95 via-neutral-900/95 to-amber-950/95 border-b border-white/10 px-4 py-1 text-center text-[11px] font-medium text-neutral-200 flex items-center justify-center gap-2.5">
          <Megaphone className="size-3.5 text-amber-400 shrink-0" />
          <span className="truncate max-w-2xl">{sysConfig.announcementBanner}</span>
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] hover:bg-amber-500 hover:text-black transition shrink-0 cursor-pointer"
          >
            Mağaza →
          </button>
          <button
            type="button"
            onClick={() => setSysConfig((prev) => ({ ...prev, announcementActive: false }))}
            className="text-neutral-400 hover:text-white p-0.5 rounded transition cursor-pointer"
            title="Duyuruyu Gizle"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Unified Master Header & Navigation Rail */}
      <header className="sticky top-0 z-30 h-16 border-b border-white/10 bg-neutral-950/90 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-2">
          {/* Logo */}
          <div
            onClick={() => setActiveTab("explore")}
            className="flex items-center gap-2 cursor-pointer shrink-0 group"
            title="Ana Sayfa / Keşfet"
          >
            <div className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition">
              <Sparkles className="size-4" />
            </div>
            <div className="hidden sm:block whitespace-nowrap">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent block leading-none">
                KAEL-AI
              </span>
              <span className="text-[9px] font-mono text-purple-400 block mt-0.5 tracking-widest uppercase">
                RP STUDIO
              </span>
            </div>
          </div>

          {/* Center: Clean Icon + Short Label Navigation Rail (No Clipping!) */}
          <nav className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-inner">
            <button
              onClick={() => setActiveTab("explore")}
              title={`Keşfet (${allExploreCharacters.length} Karakter)`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "explore"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Compass className="size-4 shrink-0" />
              <span className="hidden md:inline">Keşfet</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              title="Rol Sohbeti"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquare className="size-4 shrink-0" />
              <span className="hidden md:inline">Sohbet</span>
            </button>

            <button
              onClick={() => setActiveTab("vn")}
              title="Görsel Roman / İnteraktif Hikaye Modu"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "vn"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BookOpen className="size-4 shrink-0" />
              <span className="hidden lg:inline">Hikaye</span>
            </button>

            <button
              onClick={() => setActiveTab("groups")}
              title="Çoklu AI Grup Odaları"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "groups"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="size-4 shrink-0" />
              <span className="hidden md:inline">Gruplar</span>
            </button>

            <button
              onClick={() => setActiveTab("forge")}
              title="Karakter Atölyesi (Yeni AI Üret)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "forge"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Hammer className="size-4 shrink-0" />
              <span className="hidden md:inline">Atölye</span>
            </button>

            <button
              onClick={() => setActiveTab("store")}
              title="Mağaza, VIP Paketler & Token"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "store"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/25"
                  : "text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
              }`}
            >
              <ShoppingBag className="size-4 shrink-0" />
              <span className="hidden md:inline">Mağaza</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              title="Sosyal Profil & Karakter Vitrini"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/20"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserCircle className="size-4 shrink-0" />
              <span className="hidden lg:inline">Profil</span>
            </button>

            {/* Sleek Icon-First Admin Button */}
            <button
              onClick={() => setActiveTab("admin")}
              title="👑 Gelişmiş Admin Paneli (@kael)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-amber-500/30"
                  : isViewerAdmin
                  ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                  : "text-neutral-500 hover:text-amber-300 hover:bg-white/5"
              }`}
            >
              <Crown className="size-4 shrink-0" />
              {activeTab === "admin" && <span className="hidden sm:inline">Admin</span>}
            </button>
          </nav>

          {/* Right Controls: Compact Token Pill + User Avatar Pill + Icon-Only Menu */}
          <div className="relative flex items-center gap-1.5 shrink-0">
            {/* Daily Streak & Quests */}
            <button
              type="button"
              onClick={() => setIsQuestsModalOpen(true)}
              className="size-9 rounded-xl border border-orange-500/40 bg-orange-950/30 hover:bg-orange-900/50 text-orange-300 flex items-center justify-center transition cursor-pointer"
              title="Günlük Seri & Görevler"
            >
              <Flame className="size-4 fill-current" />
            </button>

            {/* Character Ping Bell */}
            <button
              type="button"
              onClick={() => setPingSettingsOpen(true)}
              className="size-9 rounded-xl border border-white/10 bg-neutral-900/90 hover:bg-purple-950/50 text-purple-300 flex items-center justify-center transition cursor-pointer"
              title="Karakter bildirimleri (kim arayabilir? / test)"
            >
              <Bell className="size-4" />
            </button>

            {/* Live Kael Token Wallet Pill */}
            <button
              type="button"
              onClick={() => setActiveTab("store")}
              className="h-9 px-2.5 rounded-xl border border-amber-500/35 bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              title={`Cüzdan: ${currentUserEconomy.tokens.toLocaleString("tr-TR")} Kael Token (Yüklemek için tıkla)`}
            >
              <Coins className="size-3.5 text-amber-400 shrink-0" />
              <span className="font-mono">
                {currentUserEconomy.tokens >= 100000
                  ? `${(currentUserEconomy.tokens / 1000).toFixed(0)}B`
                  : currentUserEconomy.tokens.toLocaleString("tr-TR")}
              </span>
              <Plus className="size-3 text-amber-400" />
            </button>

            {/* User Account Pill */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="h-9 px-2.5 rounded-xl border border-purple-500/35 bg-purple-950/30 hover:bg-purple-900/40 text-purple-100 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition group"
              title={`Profil & Avatar Stüdyosu (@${authSession.username})`}
            >
              <Avatar className="size-5 border border-purple-400/50">
                <AvatarImage src={authSession.avatarUrl || userProfile?.avatar_url} />
                <AvatarFallback className="bg-purple-900 text-[10px]">
                  {authSession.displayName?.[0] || "K"}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold hidden sm:inline">
                {authSession.isGuest ? "Misafir" : `@${authSession.username}`}
              </span>
              <Camera className="size-3 text-purple-400 opacity-60 group-hover:opacity-100 transition" />
              {isViewerAdmin && (
                <Crown className="size-3.5 text-amber-400 shrink-0" />
              )}
            </button>

            {/* Icon-Only AI Brain Settings Shortcut */}
            <button
              type="button"
              onClick={() => setIsBrainModalOpen(true)}
              className="size-9 rounded-xl border border-white/10 bg-neutral-900/90 hover:bg-purple-950/50 hover:border-purple-500/40 text-pink-400 flex items-center justify-center transition cursor-pointer"
              title="Yapay Zeka Beyin & Model Ayarları"
            >
              <Brain className="size-4" />
            </button>

            {/* Icon-Only 3-Line (☰) Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setIsRightMenuOpen((prev) => !prev)}
              className={`size-9 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                isRightMenuOpen
                  ? "bg-purple-600 border-purple-400 text-white shadow-lg"
                  : "bg-neutral-900/90 hover:bg-neutral-800 border-white/15 text-neutral-200"
              }`}
              title="Hızlı Menü & Tüm Araçlar"
            >
              {isRightMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            {/* 3-Line Slide-Down / Right Menu Popover */}
            <AnimatePresence>
              {isRightMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-12 w-76 rounded-2xl border border-purple-500/40 bg-neutral-900/95 backdrop-blur-2xl p-3 shadow-2xl z-50 space-y-1.5"
                >
                  <div className="px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 mb-2">
                    <div className="text-xs font-extrabold text-white flex items-center justify-between">
                      <span>{authSession.displayName}</span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">
                        {isViewerAdmin
                          ? "👑 Kurucu Admin"
                          : authSession.isGuest
                          ? "Misafir (SFW)"
                          : authSession.isAdult
                          ? "18+ Üye"
                          : "SFW Mod"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-amber-300 font-bold mt-1 flex items-center justify-between">
                      <span>🪙 Bakiye: {currentUserEconomy.tokens.toLocaleString("tr-TR")} Token</span>
                      <span className="uppercase text-[10px] text-purple-300">
                        Paket: {currentUserEconomy.tier}
                      </span>
                    </div>
                    <div className="text-[11px] text-purple-300 mt-0.5 truncate">
                      🎭 Aktif Persona: <strong>{activePersona?.name || "Kael Gezgini"}</strong>
                    </div>
                  </div>

                  {/* Admin Quick Entry */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      if (!isViewerAdmin) {
                        handleSwitchToKaelAdmin();
                      } else {
                        setActiveTab("admin");
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/35 text-xs font-bold text-amber-200 transition cursor-pointer text-left"
                  >
                    <Crown className="size-4 text-amber-400 shrink-0" />
                    <div>
                      <div>👑 @kael Gelişmiş Admin Paneli</div>
                      <div className="text-[10px] text-amber-300/80">
                        Canlı kullanıcı radarı, token gönderimi & sistem kontrolü
                      </div>
                    </div>
                  </button>

                  {/* Avatar & Profile Studio */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/35 text-xs font-semibold text-purple-100 transition cursor-pointer text-left"
                  >
                    <Camera className="size-4 text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold">📸 Profil Fotoğrafı & Avatar Stüdyosu</div>
                      <div className="text-[10px] text-purple-300/80">
                        Fotoğraf yükle, yakınlaştır, aura & çerçeve efektleri ekle
                      </div>
                    </div>
                  </button>

                  {/* Store Quick Entry */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setActiveTab("store");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-600/25 text-xs font-semibold text-neutral-100 transition cursor-pointer text-left"
                  >
                    <ShoppingBag className="size-4 text-amber-400 shrink-0" />
                    <div>
                      <div>💎 Token Mağazası & VIP Fiyatlandırma</div>
                      <div className="text-[10px] text-neutral-400">
                        Token paketleri, VIP üyelik, aşk hediyeleri & RPG eşyaları
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setIsOnboardingOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-600/25 text-xs font-semibold text-neutral-100 transition cursor-pointer text-left"
                  >
                    <LogIn className="size-4 text-emerald-400 shrink-0" />
                    <div>
                      <div>Giriş Yap / Kayıt Ol (@kael Hesap Değiştir)</div>
                      <div className="text-[10px] text-neutral-400">
                        Kullanıcı adı & şifre ile giriş veya Persona seçimi
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setActiveTab("profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-600/25 text-xs font-semibold text-neutral-100 transition cursor-pointer text-left"
                  >
                    <UserCircle className="size-4 text-purple-400 shrink-0" />
                    <div>
                      <div>Sosyal Profil & Karakter Vitrini</div>
                      <div className="text-[10px] text-neutral-400">
                        Kapak resmi, yayınlanan botlar & arkadaş listesi
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setIsBrainModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-600/25 text-xs font-semibold text-neutral-100 transition cursor-pointer text-left"
                  >
                    <Brain className="size-4 text-pink-400 shrink-0" />
                    <div>
                      <div>Yapay Zeka Beyin Ayarları</div>
                      <div className="text-[10px] text-neutral-400">
                        LLM modeli ve API anahtarı yapılandırması
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      setActiveTab("forge");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/30 text-xs font-bold text-white transition cursor-pointer text-left mt-1"
                  >
                    <Plus className="size-4 text-purple-300 shrink-0" />
                    <span>Yeni AI Karakter Oluştur (Atölye)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Unified View Canvas */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* VIEW 1: EXPLORE HUB */}
        {activeTab === "explore" && (
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Character Forge CTA Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-pink-950/40 to-neutral-900/80 p-5 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/30">
                  <Wand2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    7 Karakter Türü (Gerçekçi, Anime, Furry, Fursona, Robotik, Persona) & Çoklu AI Grup Odaları! ✨
                  </h3>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    İster &ldquo;Polis bir ayı (Furry/Fursona)&rdquo; ister &ldquo;Siber-Android&rdquo; tasarla; ardından birden fazla AI botu aynı Grup Odasına ekleyip sen hiç yazmadan birbirleriyle konuştur!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => setActiveTab("groups")}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 h-9 rounded-xl shadow-md transition-transform hover:scale-105"
                >
                  <Users className="size-3.5 mr-1.5" /> Grup Odaları
                </Button>
                <Button
                  onClick={() => setActiveTab("forge")}
                  className="bg-white hover:bg-neutral-100 text-black font-bold text-xs px-5 h-9 rounded-xl shadow-md transition-transform hover:scale-105"
                >
                  Atölyeyi Aç <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </div>
            </motion.div>

            {/* Spotlight Hero Banner */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-purple-950/50 via-neutral-900/70 to-black p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="relative z-10 max-w-2xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] uppercase font-mono tracking-wider">
                      Günün Öne Çıkan Karakteri
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-pink-400 font-mono">
                      <Flame className="size-3.5" /> {featured.likes_count} beğeni
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {featured.name}
                  </h2>

                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {featured.description || featured.tagline}
                  </p>

                  {featured.greeting_message && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-purple-200 italic line-clamp-2">
                      &ldquo;{featured.greeting_message}&rdquo;
                    </div>
                  )}

                  <div className="pt-1 flex items-center gap-3">
                    <Button
                      onClick={() => handleStartChatWithCharacter(featured.id)}
                      className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg transition-transform hover:scale-105"
                    >
                      Sohbete Başla <ArrowRight className="size-3.5 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("forge")}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs rounded-xl"
                    >
                      <Plus className="size-3.5 mr-1.5" />
                      Yeni Karakter Üret
                    </Button>
                  </div>
                </div>

                <div className="shrink-0 hidden md:block">
                  <img
                    src={featured.avatar_url || ""}
                    alt={featured.name}
                    className="size-40 rounded-2xl object-cover border-2 border-purple-500/40 shadow-2xl"
                  />
                </div>
              </motion.div>
            )}

            {/* KAYDEDİLEN KARAKTERLERİM (Saved Characters Section with Publish Toggle) */}
            {savedCharacters.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bookmark className="size-4 text-purple-400" />
                    Senin Oluşturduğun Karakterler ({savedCharacters.length})
                  </h3>
                  <span className="text-xs text-neutral-400">
                    İstediğin karakteri tek tıkla Keşfet&apos;te yayınlayabilir veya gizleyebilirsin
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedCharacters.map((char) => {
                    const isPublished = char.is_public !== false;
                    return (
                      <motion.div
                        key={char.id}
                        whileHover={{ y: -3 }}
                        className="group relative flex flex-col justify-between rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 shadow-lg backdrop-blur-md hover:border-purple-500/60 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <Avatar className="size-12 border border-purple-500/40 shadow">
                              <AvatarImage src={char.avatar_url || undefined} alt={char.name} />
                              <AvatarFallback className="bg-purple-900 text-white font-bold">
                                {char.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleTogglePublishCharacter(e, char.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                                  isPublished
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                                    : "bg-neutral-800 border-white/10 text-neutral-400 hover:text-white"
                                }`}
                                title={
                                  isPublished
                                    ? "Keşfet'te Yayında (Gizlemek için tıkla)"
                                    : "Sadece Sana Özel (Keşfet'te yayınlamak için tıkla)"
                                }
                              >
                                {isPublished ? (
                                  <>
                                    <Globe className="size-3 text-emerald-400" />
                                    Yayında
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-3" />
                                    Yayınla
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => handleDeleteSavedCharacter(e, char.id)}
                                className="size-6 rounded-md hover:bg-red-500/20 text-neutral-500 hover:text-red-400 flex items-center justify-center transition"
                                title="Sil"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                            {char.name}
                          </h4>
                          <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                            {char.tagline || char.description || "Özel karakter"}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5">
                          <Button
                            onClick={() => handleStartChatWithCharacter(char.id)}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl h-8"
                          >
                            Sohbeti Aç <ArrowRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Filter Pills & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {Object.entries(CATEGORY_MAP).map(([catKey, catLabel]) => (
                  <Button
                    key={catKey}
                    size="sm"
                    variant="ghost"
                    onClick={() => setCategoryFilter(catKey)}
                    className={`rounded-full text-xs font-medium px-3.5 h-8 transition-all shrink-0 ${
                      categoryFilter === catKey
                        ? "bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30"
                        : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {catLabel}
                  </Button>
                ))}
              </div>

              {/* Search box */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search className="absolute left-3 top-2.5 size-3.5 text-neutral-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Karakter, meslek veya tarz ara..."
                  className="pl-8 bg-white/[0.04] border-white/10 text-xs text-white placeholder:text-neutral-500 rounded-xl h-8"
                />
              </div>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredCharacters.map((char) => {
                const isUserCreated = savedCharacters.some((s) => s.id === char.id);
                return (
                  <motion.div
                    key={char.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-md hover:border-purple-500/40 hover:bg-neutral-900/90 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="relative">
                          <Avatar className="size-14 border border-white/15 shadow-md">
                            <AvatarImage
                              src={char.avatar_url || undefined}
                              alt={char.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-neutral-800 text-purple-300 font-bold">
                              {char.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isUserCreated ? (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                              🌐 Topluluk / Senin Eserin
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-white/[0.03] text-neutral-300 text-[10px] font-mono"
                            >
                              {CATEGORY_MAP[char.category] || char.category}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                        {char.name}
                      </h4>
                      <p className="mt-1 text-xs text-purple-200/90 font-medium line-clamp-2 leading-snug">
                        {char.tagline}
                      </p>
                      <p className="mt-1.5 text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {char.description}
                      </p>

                      {/* Personality mini tags */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-neutral-300">
                          Empati %{char.trait_empathy}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-neutral-300">
                          Mizah %{char.trait_humor}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-neutral-300">
                          Sertlik %{char.trait_aggression}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3 text-blue-400" />
                          {char.total_chats} sohbet
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="size-3 text-pink-400" />
                          {char.likes_count}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Cpu className="size-3" />
                          Hafızalı AI
                        </span>
                      </div>

                      <Button
                        onClick={() => handleStartChatWithCharacter(char.id)}
                        className="w-full bg-white/[0.06] hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 text-neutral-100 hover:text-white text-xs font-semibold rounded-xl h-8.5 transition-all duration-300"
                      >
                        Rol Sohbetine Başla <ArrowRight className="size-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </main>
        )}

        {/* VIEW 2: LIVE CHAT & TIMELINE BRANCHING */}
        {activeTab === "chat" && (
          <div className="flex-1 w-full flex flex-col">
            <ChatView
              initialCharacterId={selectedCharacterId}
              initialChatId={selectedChatId}
              autoOpenVoiceCall={pendingVoiceCall}
              onVoiceCallAutoOpened={() => setPendingVoiceCall(false)}
              onExploreClick={() => setActiveTab("explore")}
              onForgeClick={() => setActiveTab("forge")}
            />
          </div>
        )}

        {/* VIEW 2.2: VISUAL NOVEL */}
        {activeTab === "vn" && (
          <div className="flex-1 w-full">
            <VisualNovelView onOpenFullChat={handleStartChatWithCharacter} />
          </div>
        )}

        {/* VIEW 2.5: MULTI-BOT GROUP CHAT ROOMS */}
        {activeTab === "groups" && (
          <div className="flex-1 w-full flex flex-col">
            <GroupChatView
              onExploreClick={() => setActiveTab("explore")}
              onForgeClick={() => setActiveTab("forge")}
            />
          </div>
        )}

        {/* VIEW 3: THE CHARACTER FORGE STUDIO */}
        {activeTab === "forge" && (
          <div className="flex-1 w-full">
            <ForgeView
              onSuccess={handleForgeSuccess}
              onCancel={() => setActiveTab("explore")}
            />
          </div>
        )}

        {/* VIEW 3.5: TOKEN STORE, VIP PRICING & GIFTS/RPG SHOP */}
        {activeTab === "store" && (
          <div className="flex-1 w-full">
            <StorePricingView
              session={authSession}
              currentUserRecord={currentUserEconomy}
              onUserRecordUpdated={(updated) => setCurrentUserEconomy(updated)}
              onStartChatWithCharacter={handleStartChatWithCharacter}
            />
          </div>
        )}

        {/* VIEW 4: SOCIAL PROFILE, BANNER, BOT SHOWCASE & FRIENDS/BLOCK */}
        {activeTab === "profile" && (
          <div className="flex-1 w-full">
            <UserProfile
              session={authSession}
              onUpdateSession={(next) => {
                setAuthSession(next);
                try {
                  localStorage.setItem("kael_auth_session", JSON.stringify(next));
                } catch {
                  // ignore
                }
              }}
              userBots={
                savedCharacters.length > 0
                  ? savedCharacters
                  : FALLBACK_PERSONAS.slice(0, 6)
              }
              onStartChatWithBot={handleStartChatWithCharacter}
              onAddBotToGroup={() => setActiveTab("groups")}
              onToggleBotPublic={handleToggleBotPublicById}
              onOpenOnboarding={() => setIsOnboardingOpen(true)}
            />
          </div>
        )}

        {/* VIEW 5: ADVANCED OVERLORD ADMIN PANEL (@kael & Authorized Admins Only) */}
        {activeTab === "admin" && (
          <div className="flex-1 w-full">
            <AdminPanelView
              session={authSession}
              onSwitchToKaelAdmin={handleSwitchToKaelAdmin}
              onUserRecordUpdated={(updated) => setCurrentUserEconomy(updated)}
              characters={allExploreCharactersRaw}
              onUpdateCharacterList={(updated) => setCharacters(updated)}
              onSystemConfigUpdated={(cfg) => setSysConfig(cfg)}
            />
          </div>
        )}
      </div>

      {/* Görsel efektler: tıklama dalgası + sayfa geçiş taraması */}
      <VisualFxOverlay activeTab={activeTab} />

      {/* Günlük seri & görevler */}
      <QuestsStreakModal
        open={isQuestsModalOpen}
        onOpenChange={setIsQuestsModalOpen}
        currentUser={currentUserEconomy}
        onUserUpdated={(u) => setCurrentUserEconomy(u)}
      />

      {/* Karakterden gelen arama / SMS bildirimi */}
      <CharacterLivePing
        enabled={livePingEnabled}
        onToggleEnabled={() => setLivePingEnabled((p) => !p)}
        externalTriggerIndex={manualPingTrigger}
        settingsOpen={pingSettingsOpen}
        onSettingsOpenChange={setPingSettingsOpen}
        currentChatCharacterId={activeTab === "chat" ? selectedCharacterId : null}
        activeTab={activeTab}
        onAcceptPingAndOpenChat={(characterId, _msg, type) => {
          setPendingVoiceCall(type === "incoming_call");
          handleStartChatWithCharacter(characterId);
        }}
      />

      {/* Gelişmiş Giriş / Kayıt / Misafir + Yaş Doğrulama + Çoklu Persona Sihirbazı */}
      <OnboardingModal
        open={isOnboardingOpen}
        onOpenChange={setIsOnboardingOpen}
        session={authSession}
        onSessionUpdated={(next) => {
          setAuthSession(next);
          setCurrentUserEconomy(ensureSessionUserInPlatform(next));
        }}
        personas={personas}
        onPersonasUpdated={(nextP) => setPersonas(nextP)}
      />

      {/* Profil Düzenleme Modalı */}
      <ProfileModal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />

      {/* Yapay Zeka Beyin Ayarları Modalı */}
      <AiBrainSettingsModal
        open={isBrainModalOpen}
        onOpenChange={setIsBrainModalOpen}
      />
    </div>
  );
}

export default function UnifiedAppPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-neutral-950 text-white font-mono text-xs">
          Kael-AI Stüdyosu Yükleniyor...
        </div>
      }
    >
      <UnifiedAppContent />
    </Suspense>
  );
}
