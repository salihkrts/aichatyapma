"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Calendar,
  MessageSquare,
  Heart,
  Globe,
  Lock,
  UserPlus,
  UserMinus,
  Ban,
  Check,
  X,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  Edit3,
  Eye,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  pageTransitionVariants,
  staggerContainerVariants,
  cardItemVariants,
} from "@/lib/animations";
import {
  filterBotsByAgeGateAndBlockList,
  type AuthSessionPayload,
  type SocialUserRecord,
} from "@/lib/social/auth-age-friendship-service";
import type { CharacterWithCreator } from "@/types/database";
import { ProfileModal } from "@/components/profile-modal";

interface UserProfileProps {
  session: AuthSessionPayload;
  onUpdateSession: (next: AuthSessionPayload) => void;
  userBots: CharacterWithCreator[];
  onStartChatWithBot: (botId: string) => void;
  onAddBotToGroup?: (botId: string) => void;
  onToggleBotPublic?: (botId: string) => void;
  onOpenOnboarding?: () => void;
}

const COVER_PRESETS = [
  {
    label: "Siberpunk Neo-İstanbul",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1500&auto=format&fit=crop&q=80",
  },
  {
    label: "Gotik Gece Kalesi",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1500&auto=format&fit=crop&q=80",
  },
  {
    label: "Büyülü Gümüş Orman",
    url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1500&auto=format&fit=crop&q=80",
  },
  {
    label: "Uzay & Kuantum İstasyonu",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1500&auto=format&fit=crop&q=80",
  },
];

const INITIAL_SOCIAL_USERS: SocialUserRecord[] = [
  {
    id: "user-emre",
    username: "emre_rpg",
    displayName: "Emre Kılıç",
    avatarUrl: "/avatars/kaito.jpg",
    coverUrl: COVER_PRESETS[0].url,
    bio: "Cyberpunk ve Furry dedektif senaryoları yazarı.",
    joinedAt: "2026-02-14",
    relationStatus: "ACCEPTED",
    followersCount: 340,
    friendsCount: 48,
  },
  {
    id: "user-selin",
    username: "selin_art",
    displayName: "Selin Yıldız",
    avatarUrl: "/avatars/yuki.jpg",
    coverUrl: COVER_PRESETS[1].url,
    bio: "Anime & Fantastik karakter tasarımcısı 🌸",
    joinedAt: "2026-03-01",
    relationStatus: "PENDING_RECEIVED",
    followersCount: 820,
    friendsCount: 95,
  },
  {
    id: "user-burak",
    username: "burak_ai",
    displayName: "Burak Demir",
    avatarUrl: "/avatars/komiser-boz.jpg",
    coverUrl: COVER_PRESETS[2].url,
    bio: "Çoklu bot grup odaları ve FRP Dungeon Master.",
    joinedAt: "2026-01-20",
    relationStatus: "NONE",
    followersCount: 190,
    friendsCount: 31,
  },
  {
    id: "user-troll",
    username: "dark_spammer",
    displayName: "Gölge Hesap",
    avatarUrl: "/avatars/lilith.jpg",
    coverUrl: COVER_PRESETS[3].url,
    bio: "Kuralsız gezgin.",
    joinedAt: "2026-04-01",
    relationStatus: "BLOCKED",
    followersCount: 12,
    friendsCount: 2,
  },
];

export function UserProfile({
  session,
  onUpdateSession,
  userBots,
  onStartChatWithBot,
  onAddBotToGroup,
  onToggleBotPublic,
  onOpenOnboarding,
}: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<
    "published" | "private" | "friends" | "blocked"
  >("published");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [ViewingVisitorMode, setViewingVisitorMode] = useState(false);
  const [isAvatarStudioOpen, setIsAvatarStudioOpen] = useState(false);

  // Profile Edit State
  const [editDisplayName, setEditDisplayName] = useState(session.displayName);
  const [editUsername, setEditUsername] = useState(session.username);
  const [editBio, setEditBio] = useState(session.bio);
  const [avatarScale, setAvatarScale] = useState<number>(1);
  const [bannerOffsetY, setBannerOffsetY] = useState<number>(50);

  // Social Graph State (Friends, Requests & Blocked Users)
  const [socialUsers, setSocialUsers] = useState<SocialUserRecord[]>(INITIAL_SOCIAL_USERS);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const blockedIds = useMemo(
    () => socialUsers.filter((u) => u.relationStatus === "BLOCKED").map((u) => u.id),
    [socialUsers]
  );

  // Filter Published vs Private bots with strict Age-Gate NSFW enforcement
  const publishedBots = useMemo(() => {
    const publicOnly = userBots.filter((b) => b.is_public !== false);
    return filterBotsByAgeGateAndBlockList(publicOnly, session, blockedIds);
  }, [userBots, session, blockedIds]);

  const privateDraftBots = useMemo(
    () => userBots.filter((b) => b.is_public === false),
    [userBots]
  );

  const totalChatsCount = useMemo(
    () => userBots.reduce((acc, b) => acc + (b.total_chats || 0), 0),
    [userBots]
  );

  const totalLikesCount = useMemo(
    () => userBots.reduce((acc, b) => acc + (b.likes_count || 0), 0),
    [userBots]
  );

  const acceptedFriends = socialUsers.filter((u) => u.relationStatus === "ACCEPTED");
  const pendingRequests = socialUsers.filter(
    (u) => u.relationStatus === "PENDING_RECEIVED" || u.relationStatus === "PENDING_SENT"
  );
  const blockedUsers = socialUsers.filter((u) => u.relationStatus === "BLOCKED");

  const filteredSearchUsers = socialUsers.filter((u) => {
    if (u.relationStatus === "BLOCKED" && activeTab !== "blocked") return false;
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.bio.toLowerCase().includes(q)
    );
  });

  // Upload handlers for Cover (1500x500) & Avatar
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...session, coverUrl: String(reader.result || "") };
      onUpdateSession(next);
      localStorage.setItem("kael_auth_session", JSON.stringify(next));
      notify("🖼️ Kapak görseli (1500x500 Banner) güncellendi!");
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...session, avatarUrl: String(reader.result || "") };
      onUpdateSession(next);
      localStorage.setItem("kael_auth_session", JSON.stringify(next));
      notify("📸 Profil fotoğrafı güncellendi!");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfileEdits = () => {
    const next: AuthSessionPayload = {
      ...session,
      displayName: editDisplayName.trim() || session.displayName,
      username: editUsername.replace(/^@/, "").trim().toLowerCase() || session.username,
      bio: editBio.trim(),
    };
    onUpdateSession(next);
    localStorage.setItem("kael_auth_session", JSON.stringify(next));
    setIsEditingProfile(false);
    notify("✅ Profil bilgileriniz kaydedildi!");
  };

  const handleToggleNsfw = () => {
    if (session.isGuest || !session.isAdult) {
      notify("🔒 18 yaş altı ve Misafir hesaplarda NSFW (+18) filtresi güvenlik gereği kilitlidir.");
      return;
    }
    const next = { ...session, nsfwEnabled: !session.nsfwEnabled };
    onUpdateSession(next);
    localStorage.setItem("kael_auth_session", JSON.stringify(next));
    notify(
      next.nsfwEnabled
        ? "🔞 +18 (NSFW) içerik gösterimi açıldı."
        : "🛡️ Güvenli Mod (SFW): +18 içerikler gizlendi."
    );
  };

  // Friendship & Block Actions
  const handleSendFriendReq = (targetId: string) => {
    if (session.isGuest) {
      notify("👻 Misafir kullanıcılar arkadaş ekleyemez. Lütfen hesabınızı kalıcı üyeliğe yükseltin.");
      return;
    }
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "PENDING_SENT" } : u))
    );
    notify("📨 Arkadaşlık isteği gönderildi (PENDING).");
  };

  const handleAcceptFriend = (targetId: string) => {
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "ACCEPTED" } : u))
    );
    notify("🤝 Arkadaşlık isteği kabul edildi! Artık grup odalarına davet edebilirsiniz.");
  };

  const handleRejectOrCancelFriend = (targetId: string) => {
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "NONE" } : u))
    );
    notify("İstek iptal edildi / reddedildi.");
  };

  const handleUnfriend = (targetId: string) => {
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "NONE" } : u))
    );
    notify("Kullanıcı arkadaş listesinden çıkarıldı.");
  };

  const handleBlockUser = (targetId: string) => {
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "BLOCKED" } : u))
    );
    notify(
      "🚫 Kullanıcı engellendi (BLOCKED). Arkadaşlık silindi, profiliniz ve botlarınız bu kişiye kapatıldı."
    );
  };

  const handleUnblockUser = (targetId: string) => {
    setSocialUsers((prev) =>
      prev.map((u) => (u.id === targetId ? { ...u, relationStatus: "NONE" } : u))
    );
    notify("🔓 Kullanıcının engeli kaldırıldı.");
  };

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6"
    >
      {/* Floating Feedback Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-purple-950/95 border border-purple-500/50 text-xs font-semibold text-purple-100 shadow-2xl backdrop-blur-xl"
          >
            {feedbackToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HERO COVER BANNER (1500x500 Ratio) & AVATAR HEADER */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-neutral-900/80 shadow-2xl">
        {/* 1500x500 Cover Image */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-neutral-950">
          <img
            src={session.coverUrl}
            alt="Profil Kapak Görseli"
            style={{ objectPosition: `center ${bannerOffsetY}%` }}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />

          {/* Top-Right Cover Actions */}
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingVisitorMode(!ViewingVisitorMode)}
              className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-[11px] font-semibold text-neutral-200 backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition"
              title="Profilini dışarıdan bir ziyaretçi gözüyle test et"
            >
              <Eye className="size-3.5 text-cyan-400" />
              <span>{ViewingVisitorMode ? "Ziyaretçi Görünümü (Aktif)" : "Ziyaretçi Gözüyle Bak"}</span>
            </button>

            {!ViewingVisitorMode && (
              <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 text-[11px] font-semibold text-white backdrop-blur-md flex items-center gap-1.5 transition">
                <Camera className="size-3.5 text-purple-400" />
                <span>Kapak Değiştir (1500x500)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Profile Info & Stats Bar */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Circular Avatar with Zoom/Crop support */}
            <div className="relative size-28 sm:size-32 rounded-full border-4 border-neutral-950 bg-neutral-900 overflow-hidden shadow-2xl shrink-0 group">
              <img
                src={session.avatarUrl}
                alt={session.displayName}
                style={{ transform: `scale(${avatarScale})` }}
                className="w-full h-full object-cover transition-transform duration-200"
              />
              {!ViewingVisitorMode && (
                <button
                  type="button"
                  onClick={() => setIsAvatarStudioOpen(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold text-white cursor-pointer transition-opacity"
                  title="Avatar Stüdyosunu Aç (Yakınlaştır, Çerçeve Seç, Düzenle)"
                >
                  <Camera className="size-5 text-purple-300 mb-1" />
                  <span>Avatar Düzenle</span>
                </button>
              )}
            </div>

            {/* Name, @username, Badges */}
            <div className="space-y-1.5 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {session.displayName}
                </h1>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/50 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  @{session.username}
                </span>

                {session.isGuest ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                    👻 Misafir Hesap (SFW)
                  </Badge>
                ) : session.isAdult ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                    18+ Yetişkin
                  </Badge>
                ) : (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px]">
                    🛡️ 18 Yaş Altı Korumalı (SFW)
                  </Badge>
                )}
              </div>

              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                {session.bio}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-purple-400" />
                  Katılım: {new Date(session.joinedAt).toLocaleDateString("tr-TR")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5 text-emerald-400" />
                  <strong className="text-white">{acceptedFriends.length}</strong> Arkadaş
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3.5 text-blue-400" />
                  <strong className="text-white">{totalChatsCount.toLocaleString("tr-TR")}</strong> Toplam Sohbet
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="size-3.5 text-pink-400" />
                  <strong className="text-white">{totalLikesCount.toLocaleString("tr-TR")}</strong> Toplam Beğeni
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Edit Profile / NSFW Age-Gate Switch / Visitor Social Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {ViewingVisitorMode ? (
              <>
                <Button
                  size="sm"
                  onClick={() => notify("📨 Bu kullanıcıya arkadaşlık isteği gönderildi!")}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                >
                  <UserPlus className="size-3.5 mr-1.5" /> Arkadaş Ekle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => notify("🚫 Kullanıcı engellendi (BLOCKED).")}
                  className="border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-200 text-xs rounded-xl"
                >
                  <Ban className="size-3.5 mr-1.5" /> Engelle
                </Button>
              </>
            ) : (
              <>
                {/* Age-Gate NSFW Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleNsfw}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    session.isGuest || !session.isAdult
                      ? "bg-neutral-900/90 border-white/10 text-neutral-500 cursor-not-allowed"
                      : session.nsfwEnabled
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-200"
                      : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                  }`}
                  title={
                    session.isGuest || !session.isAdult
                      ? "18 yaş altı ve Misafir kullanıcılar için NSFW içerik anahtarı kilitlidir"
                      : "+18 NSFW içerikleri aç/kapat"
                  }
                >
                  {session.isGuest || !session.isAdult ? (
                    <>
                      <ShieldAlert className="size-3.5 text-amber-400" />
                      <span>NSFW Kilitli (SFW Zorunlu)</span>
                    </>
                  ) : session.nsfwEnabled ? (
                    <>
                      <Unlock className="size-3.5 text-rose-400" />
                      <span>+18 NSFW: Açık</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-3.5 text-emerald-400" />
                      <span>SFW Güvenli Mod</span>
                    </>
                  )}
                </button>

                {onOpenOnboarding && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenOnboarding}
                    className="border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/50 text-purple-200 text-xs rounded-xl"
                  >
                    <Sparkles className="size-3.5 mr-1.5 text-purple-400" />
                    {session.isGuest ? "Hesabı Kalıcı Yap & Persona" : "Persona Sihirbazı"}
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => setIsAvatarStudioOpen(true)}
                  className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs rounded-xl border border-purple-500/40"
                >
                  <Camera className="size-3.5 mr-1.5 text-purple-400" />
                  Avatar Stüdyosu
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="bg-white/10 hover:bg-white/15 text-white text-xs rounded-xl border border-white/15"
                >
                  <Edit3 className="size-3.5 mr-1.5" />
                  {isEditingProfile ? "Düzenlemeyi Kapat" : "Profili Özelleştir"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expandable Profile & Crop / Banner Customization Drawer */}
        <AnimatePresence>
          {isEditingProfile && !ViewingVisitorMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pb-6 pt-4 border-t border-white/10 bg-neutral-950/70 space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Görünen Ad:
                  </label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="bg-neutral-900 border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Kullanıcı Adı (<code>@username</code>):
                  </label>
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="bg-neutral-900 border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Avatar Yakınlaştırma (Crop / Zoom): %{Math.round(avatarScale * 100)}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={1.6}
                    step={0.05}
                    value={avatarScale}
                    onChange={(e) => setAvatarScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Biyografi (Bio):
                  </label>
                  <Textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="bg-neutral-900 border-white/15 text-xs text-white resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">
                      Hazır Kapak Görselleri (1500x500) & Dikey Konum (%{bannerOffsetY}):
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bannerOffsetY}
                      onChange={(e) => setBannerOffsetY(parseInt(e.target.value, 10))}
                      className="w-28 accent-purple-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COVER_PRESETS.map((cp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = { ...session, coverUrl: cp.url };
                          onUpdateSession(next);
                          localStorage.setItem("kael_auth_session", JSON.stringify(next));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-600/30 border border-white/10 text-[11px] text-neutral-300 hover:text-white transition cursor-pointer"
                      >
                        {cp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveProfileEdits}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-xl px-5"
                >
                  <Check className="size-3.5 mr-1.5" /> Değişiklikleri Kaydet
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. SLIDING NAVIGATION TABS (layoutId="profileActiveTabLine") */}
        <div className="flex items-center gap-6 px-6 border-t border-white/10 bg-neutral-950/60 overflow-x-auto no-scrollbar">
          {[
            {
              id: "published",
              label: `🌐 Yayınlanan Karakterler (${publishedBots.length})`,
              show: true,
            },
            {
              id: "private",
              label: `🔒 Gizli & Taslaklar (${privateDraftBots.length})`,
              show: !ViewingVisitorMode,
            },
            {
              id: "friends",
              label: `👥 Arkadaşlar & İstekler (${acceptedFriends.length + pendingRequests.length})`,
              show: true,
            },
            {
              id: "blocked",
              label: `🚫 Engellenen Kullanıcılar (${blockedUsers.length})`,
              show: !ViewingVisitorMode,
            },
          ]
            .filter((t) => t.show)
            .map((tab) => {
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id as "published" | "private" | "friends" | "blocked")
                  }
                  className={`relative py-3.5 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isAct ? "text-purple-300" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {isAct && (
                    <motion.div
                      layoutId="profileActiveTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* 3. TAB CONTENTS */}
      <AnimatePresence mode="wait">
        {/* TAB A & B: PUBLISHED BOTS SHOWCASE OR PRIVATE BOTS */}
        {(activeTab === "published" || activeTab === "private") && (
          <motion.div
            key={activeTab}
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {(activeTab === "published" ? publishedBots : privateDraftBots).map((bot) => (
              <motion.div
                key={bot.id}
                variants={cardItemVariants}
                whileHover="hover"
                whileTap="tap"
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-neutral-900/70 p-5 shadow-xl backdrop-blur-md hover:border-purple-500/50 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <img
                      src={bot.avatar_url || "/avatars/yuki.jpg"}
                      alt={bot.name}
                      className="size-14 rounded-2xl object-cover border border-purple-500/40 shadow-md"
                    />
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={
                          bot.is_nsfw
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px]"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"
                        }
                      >
                        {bot.is_nsfw ? "🔞 +18 NSFW" : "🛡️ SFW"}
                      </Badge>

                      {!ViewingVisitorMode && onToggleBotPublic && (
                        <button
                          type="button"
                          onClick={() => onToggleBotPublic(bot.id)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 flex items-center gap-1 cursor-pointer"
                        >
                          {bot.is_public !== false ? (
                            <>
                              <Globe className="size-3 text-emerald-400" /> Public
                            </>
                          ) : (
                            <>
                              <Lock className="size-3 text-amber-400" /> Private
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-1">{bot.name}</h3>
                  <p className="text-xs text-purple-200/90 mt-1 line-clamp-2">
                    {bot.tagline || bot.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(bot.tags || ["RPG", "AI"]).slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5 text-neutral-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3 text-blue-400" />
                      {bot.total_chats || 0} sohbet
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="size-3 text-pink-400" />
                      {bot.likes_count || 0} beğeni
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => onStartChatWithBot(bot.id)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-xl h-8"
                    >
                      Sohbet Başlat <ArrowRight className="size-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (onAddBotToGroup) onAddBotToGroup(bot.id);
                        notify(`🤖 "${bot.name}" grup odasına eklendi!`);
                      }}
                      className="border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200 text-[11px] rounded-xl h-8"
                    >
                      + Gruba Ekle
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* TAB C: FRIENDSHIP ENGINE (SEARCH, ADD, ACCEPT/REJECT, UNFRIEND, BLOCK) */}
        {activeTab === "friends" && (
          <motion.div
            key="friends-tab"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            {/* Debounced User Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-neutral-900/70">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 size-4 text-neutral-500" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="@kullanici_adi veya görünen isim ile kişi ara..."
                  className="pl-9 bg-neutral-950 border-white/15 text-xs text-white rounded-xl"
                />
              </div>
              <span className="text-xs text-neutral-400">
                Yalnızca onaylı (<code>ACCEPTED</code>) arkadaşlarınızı özel AI grup odalarına davet edebilirsiniz.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSearchUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl border border-white/10 bg-neutral-900/60 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="size-12 rounded-2xl object-cover border border-purple-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">
                          {u.displayName}
                        </h4>
                        <span className="text-[11px] font-mono text-purple-400">
                          @{u.username}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">{u.bio}</p>
                    </div>
                  </div>

                  {/* Friendship & Block Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.relationStatus === "ACCEPTED" && (
                      <>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                          Arkadaş
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleUnfriend(u.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-neutral-400 hover:text-amber-300 transition cursor-pointer"
                          title="Arkadaşlıktan Çıkar (Unfriend)"
                        >
                          <UserMinus className="size-3.5" />
                        </button>
                      </>
                    )}

                    {u.relationStatus === "PENDING_RECEIVED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptFriend(u.id)}
                          className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] rounded-xl"
                        >
                          <Check className="size-3.5 mr-1" /> Kabul Et
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectOrCancelFriend(u.id)}
                          className="h-8 px-2.5 border-white/15 text-neutral-300 text-[11px] rounded-xl"
                        >
                          <X className="size-3.5" /> Reddet
                        </Button>
                      </>
                    )}

                    {u.relationStatus === "PENDING_SENT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectOrCancelFriend(u.id)}
                        className="h-8 px-3 border-amber-500/40 bg-amber-950/30 text-amber-200 text-[11px] rounded-xl"
                      >
                        İsteği Geri Çek
                      </Button>
                    )}

                    {u.relationStatus === "NONE" && (
                      <Button
                        size="sm"
                        onClick={() => handleSendFriendReq(u.id)}
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-xl"
                      >
                        <UserPlus className="size-3.5 mr-1" /> Arkadaş Ekle
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleBlockUser(u.id)}
                      className="p-2 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 text-red-300 transition cursor-pointer"
                      title="Kullanıcıyı Engelle (Block)"
                    >
                      <Ban className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB D: BLOCKED USERS ISOLATION & UNBLOCK */}
        {activeTab === "blocked" && (
          <motion.div
            key="blocked-tab"
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
          >
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-950/20 text-xs text-red-200">
              <strong>Katı İzolasyon Kuralı (Strict Block Isolation):</strong> Engellediğiniz kişiler profilinizi görüntüleyemez, yayınladığınız AI karakterleri göremez, arkadaşlık isteği gönderemez ve ortak grup sohbetlerindeki mesajları size otomatik gizlenir.
            </div>

            {blockedUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 border border-white/5 rounded-2xl">
                Engellenen kullanıcı bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blockedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border border-red-500/30 bg-neutral-900/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.displayName}
                        className="size-11 rounded-2xl object-cover grayscale opacity-60"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-300">
                          {u.displayName} <span className="text-xs font-mono text-neutral-500">(@{u.username})</span>
                        </h4>
                        <span className="text-[11px] text-red-400">🚫 Engellendi (Tam İzolasyon)</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnblockUser(u.id)}
                      className="border-white/15 hover:bg-white/10 text-xs text-white rounded-xl"
                    >
                      Engeli Kaldır (Unblock)
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Stüdyosu & Profil Düzenleme Modalı */}
      <ProfileModal
        open={isAvatarStudioOpen}
        onOpenChange={setIsAvatarStudioOpen}
        onProfileUpdated={(updated) => {
          const next = {
            ...session,
            avatarUrl: updated.avatar_url,
            displayName: updated.display_name,
            username: updated.username,
            bio: updated.bio,
          };
          onUpdateSession(next);
          localStorage.setItem("kael_auth_session", JSON.stringify(next));
          notify("📸 Profil fotoğrafınız ve detaylarınız başarıyla güncellendi!");
        }}
      />
    </motion.div>
  );
}
