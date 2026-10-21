"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Users,
  Coins,
  Crown,
  Terminal,
  Search,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  Megaphone,
  Ticket,
  Sliders,
  Eye,
  Lock,
  Unlock,
  Heart,
  MessageSquare,
  PhoneCall,
  Sparkles,
  RefreshCw,
  UserCheck,
  KeyRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPlatformUsers,
  savePlatformUsers,
  getActivityLogs,
  recordPlatformActivity,
  adjustUserTokens,
  getPromoCodes,
  savePromoCodes,
  getSystemConfig,
  saveSystemConfig,
  isUserAuthorizedAdmin,
  type PlatformUserRecord,
  type PlatformActivityLog,
  type PromoCodeRecord,
  type SystemGlobalConfig,
  type UserTier,
  type ActivityCategory,
} from "@/lib/economy/economy-service";
import type { AuthSessionPayload } from "@/lib/social/auth-age-friendship-service";
import type { CharacterWithCreator } from "@/types/database";

interface AdminPanelViewProps {
  session: AuthSessionPayload;
  onSwitchToKaelAdmin: () => void;
  onUserRecordUpdated: (updated: PlatformUserRecord) => void;
  characters: CharacterWithCreator[];
  onUpdateCharacterList?: (updated: CharacterWithCreator[]) => void;
  onSystemConfigUpdated?: (config: SystemGlobalConfig) => void;
}

type AdminSubTab =
  | "telemetry"
  | "users"
  | "permissions"
  | "characters"
  | "promos_system";

const LIVE_SIMULATED_EVENTS: Array<{
  username: string;
  displayName: string;
  avatarUrl: string;
  category: ActivityCategory;
  actionTitle: string;
  details: string;
  characterName?: string;
  messageSnippet?: string;
  tokensDelta?: number;
  priceTry?: number;
  severity: "info" | "success" | "warning";
}> = [
  {
    username: "emre_gezgini",
    displayName: "Emre Yıldırım",
    avatarUrl: "/avatars/komiser-boz.jpg",
    category: "chat",
    actionTitle: "Rol Sohbeti Mesajı Gönderdi",
    details: "Yuki ile Akademi Kütüphanesi sahnesinde mesajlaştı (Model: Llama-3.3-70B).",
    characterName: "Yuki",
    messageSnippet:
      "Yuki, sınav notlarını benimle paylaşırsan sana okul çıkışında en sevdiğin çilekli pastayı ısmarlarım!",
    tokensDelta: -2,
    severity: "info",
  },
  {
    username: "selin_chan",
    displayName: "Selin Aksoy",
    avatarUrl: "/avatars/yuki.jpg",
    category: "voice",
    actionTitle: "Canlı Sesli Arama Başlattı",
    details: "Kaito ile sesli aramaya bağlandı (Ses: 'anime-boy-kaito', Groq Whisper STT aktif).",
    characterName: "Kaito",
    messageSnippet: "Kaito, lonca görevine çıkmadan önce kalkanımı kontrol eder misin?",
    tokensDelta: -5,
    severity: "info",
  },
  {
    username: "zeynep_nocturne",
    displayName: "Zeynep Kaya",
    avatarUrl: "/avatars/aria.jpg",
    category: "store",
    actionTitle: "Karakter Hediyesi Gönderdi",
    details: "Lilith karakterine 'Kristal Melodi Kutusu' hediye etti (+35 İlişki Puanı).",
    characterName: "Lilith",
    tokensDelta: -350,
    severity: "success",
  },
  {
    username: "berk_x99",
    displayName: "Berkay Demir",
    avatarUrl: "/avatars/luna.jpg",
    category: "rpg",
    actionTitle: "D20 Kader Zarı Attı",
    details: "Komiser Boz sorgu sahnesinde D20 zar attı (Sonuç: 17 - Başarılı İkna).",
    characterName: "Komiser Boz",
    messageSnippet: "[ 🎲 D20 Zar Atışı: 17 ] Komiserim, olay gecesi limanda olduğuma dair kamera kayıtları var.",
    tokensDelta: -2,
    severity: "info",
  },
];

export function AdminPanelView({
  session,
  onSwitchToKaelAdmin,
  onUserRecordUpdated,
  characters,
  onUpdateCharacterList,
  onSystemConfigUpdated,
}: AdminPanelViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("telemetry");
  const [users, setUsers] = useState<PlatformUserRecord[]>(() => getPlatformUsers());
  const [logs, setLogs] = useState<PlatformActivityLog[]>(() => getActivityLogs());
  const [promos, setPromos] = useState<PromoCodeRecord[]>(() => getPromoCodes());
  const [sysConfig, setSysConfig] = useState<SystemGlobalConfig>(() => getSystemConfig());

  // Filters
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [liveStreamEnabled, setLiveStreamEnabled] = useState<boolean>(true);

  // Token Grant Modal State
  const [tokenModalUser, setTokenModalUser] = useState<PlatformUserRecord | null>(null);
  const [customTokenDelta, setCustomTokenDelta] = useState<number>(10000);
  const [tokenGrantReason, setTokenGrantReason] = useState<string>(
    "👑 @kael Kurucu Admin Özel Token Gönderimi"
  );

  // User Detail / Chat Inspector Modal
  const [inspectedUser, setInspectedUser] = useState<PlatformUserRecord | null>(null);

  // Admin Permission Grant Input
  const [newAdminUsername, setNewAdminUsername] = useState<string>("");

  // Promo Creator Inputs
  const [newPromoCode, setNewPromoCode] = useState<string>("");
  const [newPromoTokens, setNewPromoTokens] = useState<number>(5000);
  const [newPromoTier, setNewPromoTier] = useState<string>("none");
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number>(100);

  // Admin Feedback Toast
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const refreshAllData = () => {
    setUsers(getPlatformUsers());
    setLogs(getActivityLogs());
    setPromos(getPromoCodes());
    setSysConfig(getSystemConfig());
  };

  useEffect(() => {
    refreshAllData();
    const handler = () => refreshAllData();
    window.addEventListener("kael_economy_updated", handler);
    return () => window.removeEventListener("kael_economy_updated", handler);
  }, []);

  // Optional live simulated stream so admin can see live incoming events
  useEffect(() => {
    if (!liveStreamEnabled) return;
    const interval = setInterval(() => {
      const pick =
        LIVE_SIMULATED_EVENTS[Math.floor(Math.random() * LIVE_SIMULATED_EVENTS.length)];
      recordPlatformActivity(pick);
    }, 14000);
    return () => clearInterval(interval);
  }, [liveStreamEnabled]);

  const isAuthorized = isUserAuthorizedAdmin(session.username);

  // ============================================================
  // UNAUTHORIZED ACCESS GUARD (ONLY @kael & AUTHORIZED ADMINS)
  // ============================================================
  if (!isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-red-500/40 bg-gradient-to-b from-red-950/50 via-neutral-900 to-neutral-950 p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="size-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <ShieldAlert className="size-8" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-xs font-mono">
              🔒 KISITLI YÖNETİCİ ALANI (YETKİSİZ HESAP)
            </Badge>
            <h2 className="text-2xl font-black text-white">
              Bu Panele Sadece @kael ve Yetkili Yöneticiler Erişebilir
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Şu anda <strong>@{session.username}</strong> ({session.displayName}) hesabıyla oturum açmış durumdasınız.
              Kael-AI Gelişmiş Admin Paneli yalnızca kurucu hesap olan{" "}
              <code className="text-amber-300 font-bold">@kael</code> ve onun yetkilendirdiği yöneticilere açıktır.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950/90 border border-amber-500/30 max-w-md mx-auto space-y-3">
            <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
              <Crown className="size-4" />
              <span>Kurucu @kael Hesabına Hızlı Geçiş</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Tek tıkla <strong>@kael</strong> kurucu yönetici hesabına geçiş yaparak tüm kullanıcı aktivitelerini izleyebilir ve token dağıtabilirsiniz.
            </p>
            <Button
              onClick={onSwitchToKaelAdmin}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs h-10 rounded-xl shadow-lg cursor-pointer"
            >
              👑 @kael (Kurucu Admin) Hesabına Geç ve Paneli Aç
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================

  const handleQuickTokenAdjust = (
    targetUser: PlatformUserRecord,
    delta: number,
    customReason?: string
  ) => {
    const updated = adjustUserTokens(
      targetUser.username,
      delta,
      delta >= 0
        ? `👑 Admin (@${session.username}) +${delta.toLocaleString("tr-TR")} 🪙 Ekledi`
        : `👑 Admin (@${session.username}) ${delta.toLocaleString("tr-TR")} 🪙 Düşürdü`,
      customReason ||
        `@${session.username} yönetici panelinden @${targetUser.username} hesabına ${
          delta >= 0 ? "+" : ""
        }${delta.toLocaleString("tr-TR")} 🪙 işlem uyguladı.`,
      "admin"
    );

    if (updated) {
      refreshAllData();
      if (updated.username.toLowerCase() === session.username.toLowerCase()) {
        onUserRecordUpdated(updated);
      }
      showToast(
        `✅ @${targetUser.username} hesabına ${delta >= 0 ? "+" : ""}${delta.toLocaleString("tr-TR")} 🪙 uygulandı! (Yeni Bakiye: ${updated.tokens.toLocaleString("tr-TR")} 🪙)`
      );
    }
  };

  const handleSetUserTier = (targetUser: PlatformUserRecord, newTier: UserTier) => {
    const badgeMap: Record<UserTier, string | undefined> = {
      free: undefined,
      plus: "⚡ PLUS",
      pro: "🔥 PRO STUDIO",
      sovereign: "👑 İMPARATOR VIP",
    };

    const nextUsers = users.map((u) =>
      u.username.toLowerCase() === targetUser.username.toLowerCase()
        ? {
            ...u,
            tier: newTier,
            equippedBadge:
              u.username.toLowerCase() === "kael" ? "👑 Kurucu Admin" : badgeMap[newTier],
            currentActivity: `👑 Admin tarafından ${newTier.toUpperCase()} paketine yükseltildi`,
          }
        : u
    );
    savePlatformUsers(nextUsers);
    refreshAllData();

    recordPlatformActivity({
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
      category: "admin",
      actionTitle: `Kullanıcı Paketi Değiştirildi (${newTier.toUpperCase()})`,
      details: `@${session.username}, @${targetUser.username} hesabının üyelik paketini '${newTier.toUpperCase()}' olarak güncelledi.`,
      severity: "success",
    });

    showToast(`✅ @${targetUser.username} paketi '${newTier.toUpperCase()}' olarak güncellendi!`);
  };

  const handleToggleUserStatus = (
    targetUser: PlatformUserRecord,
    nextStatus: "active" | "muted" | "banned"
  ) => {
    if (targetUser.username.toLowerCase() === "kael") {
      showToast("⚠️ Kurucu @kael hesabı kısıtlanamaz!");
      return;
    }

    const nextUsers = users.map((u) =>
      u.username.toLowerCase() === targetUser.username.toLowerCase()
        ? {
            ...u,
            status: nextStatus,
            currentActivity:
              nextStatus === "banned"
                ? "🚫 Yönetici Tarafından Yasaklandı (BAN)"
                : nextStatus === "muted"
                ? "🔇 Yönetici Tarafından Susturuldu"
                : "✅ Hesap Aktif Edildi",
          }
        : u
    );
    savePlatformUsers(nextUsers);
    refreshAllData();

    recordPlatformActivity({
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
      category: "security",
      actionTitle: `Moderasyon İşlemi: ${nextStatus.toUpperCase()}`,
      details: `@${session.username} tarafından @${targetUser.username} hesap durumu '${nextStatus}' yapıldı.`,
      severity: nextStatus === "active" ? "success" : "critical",
    });

    showToast(`🛡️ @${targetUser.username} hesap durumu '${nextStatus.toUpperCase()}' yapıldı.`);
  };

  const handleAddAuthorizedAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAdminUsername.replace(/^@/, "").trim().toLowerCase();
    if (!clean) return;

    const updatedConfig = saveSystemConfig({
      ...sysConfig,
      authorizedAdmins: [...sysConfig.authorizedAdmins, clean],
    });
    setSysConfig(updatedConfig);

    // Also mark in users table if present
    const nextUsers = users.map((u) =>
      u.username.toLowerCase() === clean ? { ...u, isAdmin: true } : u
    );
    savePlatformUsers(nextUsers);
    setNewAdminUsername("");
    refreshAllData();

    recordPlatformActivity({
      username: session.username,
      displayName: session.displayName,
      category: "admin",
      actionTitle: `Yeni Admin Yetkisi Verildi: @${clean}`,
      details: `@${session.username}, @${clean} hesabına Admin Paneli erişim yetkisi tanımladı.`,
      severity: "warning",
    });

    showToast(`👑 @${clean} hesabına Admin Paneli erişim yetkisi verildi!`);
  };

  const handleRemoveAuthorizedAdmin = (usernameToRemove: string) => {
    const clean = usernameToRemove.toLowerCase();
    if (clean === "kael") {
      showToast("⚠️ Kurucu @kael hesabının yetkisi kaldırılamaz!");
      return;
    }

    const updatedConfig = saveSystemConfig({
      ...sysConfig,
      authorizedAdmins: sysConfig.authorizedAdmins.filter((a) => a !== clean),
    });
    setSysConfig(updatedConfig);

    const nextUsers = users.map((u) =>
      u.username.toLowerCase() === clean ? { ...u, isAdmin: false } : u
    );
    savePlatformUsers(nextUsers);
    refreshAllData();
    showToast(`🔒 @${clean} hesabının admin yetkisi geri alındı.`);
  };

  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPromoCode.trim().toUpperCase();
    if (!code) return;

    const newPromo: PromoCodeRecord = {
      code,
      tokensReward: Number(newPromoTokens) || 1000,
      tierReward:
        newPromoTier !== "none" ? (newPromoTier as UserTier) : undefined,
      maxUses: Number(newPromoMaxUses) || 100,
      usedCount: 0,
      usedByUsernames: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const nextPromos = [
      newPromo,
      ...promos.filter((p) => p.code.toUpperCase() !== code),
    ];
    savePromoCodes(nextPromos);
    setPromos(nextPromos);
    setNewPromoCode("");

    recordPlatformActivity({
      username: session.username,
      displayName: session.displayName,
      category: "admin",
      actionTitle: `Yeni Hediye Kodu Üretildi: ${code}`,
      details: `${code} kodu (+${newPromo.tokensReward.toLocaleString("tr-TR")} 🪙, Limit: ${newPromo.maxUses}) oluşturuldu.`,
      severity: "success",
    });

    showToast(`🎟️ '${code}' promosyon kodu başarıyla oluşturuldu!`);
  };

  // Computed KPI Metrics
  const totalTokensInCirculation = users.reduce((acc, u) => acc + u.tokens, 0);
  const totalMessagesPlatform = users.reduce((acc, u) => acc + u.totalMessages, 0);
  const totalVoiceMinsPlatform = users.reduce((acc, u) => acc + u.totalVoiceMinutes, 0);
  const totalRevenueTry = logs.reduce((acc, l) => acc + (l.priceTry || 0), 2840);

  const filteredLogs = logs.filter((l) => {
    const matchesCat = logCategoryFilter === "all" || l.category === logCategoryFilter;
    const q = logSearch.toLowerCase();
    const matchesQ =
      !q ||
      l.username.toLowerCase().includes(q) ||
      l.displayName.toLowerCase().includes(q) ||
      l.actionTitle.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      (l.characterName || "").toLowerCase().includes(q) ||
      (l.messageSnippet || "").toLowerCase().includes(q);
    return matchesCat && matchesQ;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.currentActivity.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Admin Command Header */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-purple-950/50 to-neutral-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-black font-black text-xs px-3 py-0.5">
                👑 KAEL-AI OVERLORD ADMİN PANELİ
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono">
                Yetkili: @{session.username} (Tam Erişim)
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-xs font-mono">
                Yetkili Admin Sayısı: {sysConfig.authorizedAdmins.length}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Canlı Kullanıcı Telemetrisi, Token Hazinesi & Sistem Yönetimi
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl">
              Platformdaki kullanıcıların kimlerle ne konuştuğunu, sesli aramalarını, zar atışlarını ve mağaza harcamalarını anlık izle; istediğin hesaba tek tıkla Kael Token (`🪙`) veya VIP üyelik tanımla.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => {
                const kaelUser = users.find((u) => u.username.toLowerCase() === "kael");
                if (kaelUser) {
                  handleQuickTokenAdjust(
                    kaelUser,
                    100000,
                    "👑 @kael Kurucu Hazinesinden +100.000 🪙 Kendine Yükleme"
                  );
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs h-10 px-4 rounded-xl shadow-lg cursor-pointer"
            >
              <Coins className="size-4 mr-1.5" />
              @kael Hesabıma +100.000 🪙 Ekle
            </Button>

            <Button
              variant="outline"
              onClick={refreshAllData}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs h-10 rounded-xl cursor-pointer"
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Verileri Yenile
            </Button>
          </div>
        </div>

        {/* 6 Executive KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10">
            <div className="text-[10px] font-mono uppercase text-neutral-400">
              Kayıtlı & Aktif Üye
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
              <Users className="size-4 text-purple-400" />
              <span>{users.length} Hesap</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">● Canlı İzleniyor</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-amber-500/30">
            <div className="text-[10px] font-mono uppercase text-amber-300/80">
              Dolaşımdaki Token
            </div>
            <div className="text-xl font-black text-amber-300 mt-1">
              {totalTokensInCirculation.toLocaleString("tr-TR")} 🪙
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">Merkez Bankası Aktif</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10">
            <div className="text-[10px] font-mono uppercase text-neutral-400">
              Toplam Rol Mesajı
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
              <MessageSquare className="size-4 text-blue-400" />
              <span>{totalMessagesPlatform.toLocaleString("tr-TR")}</span>
            </div>
            <div className="text-[10px] text-blue-300 mt-0.5">RAG Hafıza Aktif</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10">
            <div className="text-[10px] font-mono uppercase text-neutral-400">
              Canlı Sesli Arama
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
              <PhoneCall className="size-4 text-emerald-400" />
              <span>{totalVoiceMinsPlatform} dk</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">14 Neural Ses</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-emerald-500/30">
            <div className="text-[10px] font-mono uppercase text-emerald-300/80">
              Mağaza Cirosu
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {totalRevenueTry.toLocaleString("tr-TR")}₺
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">VIP & Token Satışı</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10">
            <div className="text-[10px] font-mono uppercase text-neutral-400">
              Aktif AI Karakter
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-center gap-1.5">
              <Sparkles className="size-4 text-pink-400" />
              <span>{characters.length} Bot</span>
            </div>
            <div className="text-[10px] text-pink-300 mt-0.5">Vitrin & Atölye</div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {adminToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center justify-between"
          >
            <span>{adminToast}</span>
            <button
              type="button"
              onClick={() => setAdminToast(null)}
              className="text-amber-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        {[
          {
            id: "telemetry",
            label: "📡 Canlı Aktivite Radarı (Kim Ne Yapıyor?)",
            icon: Activity,
          },
          {
            id: "users",
            label: `👥 Kullanıcılar & Token Gönder (${users.length})`,
            icon: Users,
          },
          {
            id: "permissions",
            label: `🔐 Admin Yetkileri (${sysConfig.authorizedAdmins.length})`,
            icon: KeyRound,
          },
          {
            id: "characters",
            label: `🤖 Karakter & Bot Moderasyonu (${characters.length})`,
            icon: Sparkles,
          },
          {
            id: "promos_system",
            label: "🎟️ Hediye Kodları & Sistem Ayarları",
            icon: Sliders,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as AdminSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25"
                  : "bg-neutral-900/90 text-neutral-400 hover:text-white border border-white/10"
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB 1: REAL-TIME USER TELEMETRY & ACTIVITY STREAM
      ============================================================ */}
      {activeSubTab === "telemetry" && (
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "🌐 Tüm Hareketler" },
                { id: "chat", label: "💬 Sohbet & Mesajlar" },
                { id: "voice", label: "📞 Sesli Aramalar" },
                { id: "store", label: "💎 Mağaza & Token" },
                { id: "rpg", label: "🎲 RPG & Zar" },
                { id: "forge", label: "🔨 Atölye" },
                { id: "security", label: "🛡️ Güvenlik / 18+" },
                { id: "admin", label: "👑 Admin İşlemleri" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setLogCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    logCategoryFilter === cat.id
                      ? "bg-amber-500 text-black"
                      : "bg-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 size-3.5 text-neutral-500" />
                <Input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="@kullanici, karakter veya mesaj ara..."
                  className="pl-8 bg-neutral-950 border-white/15 text-xs text-white h-8 rounded-xl"
                />
              </div>

              <button
                type="button"
                onClick={() => setLiveStreamEnabled((p) => !p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  liveStreamEnabled
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-neutral-950 border-white/10 text-neutral-400"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    liveStreamEnabled ? "bg-emerald-400 animate-ping" : "bg-neutral-500"
                  }`}
                />
                <span>{liveStreamEnabled ? "Canlı Akış: AÇIK" : "Canlı Akış: DURAKLATILDI"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-white/10 bg-neutral-900/75 hover:border-amber-500/35 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <Avatar className="size-11 border border-white/15 shrink-0">
                    <AvatarImage src={log.avatarUrl} />
                    <AvatarFallback className="bg-purple-900 text-xs font-bold">
                      {log.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-white">
                        @{log.username}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        ({log.displayName})
                      </span>
                      <Badge
                        className={`text-[10px] ${
                          log.severity === "critical"
                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                            : log.severity === "warning"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : log.severity === "success"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {log.actionTitle}
                      </Badge>
                      {log.characterName && (
                        <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30 text-[10px]">
                          🎭 Karakter: {log.characterName}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300">{log.details}</p>

                    {log.messageSnippet && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-neutral-950/90 border border-purple-500/25 text-xs text-purple-200 font-mono">
                        💬 İçerik Kaydı: &ldquo;{log.messageSnippet}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 text-right">
                  <div className="text-[11px] font-mono text-neutral-400">
                    {new Date(log.timestamp).toLocaleTimeString("tr-TR")} • IP:{" "}
                    {log.ipMask || "88.241.***.10"}
                  </div>

                  <div className="flex items-center gap-2">
                    {typeof log.tokensDelta === "number" && log.tokensDelta !== 0 && (
                      <Badge
                        className={`font-mono text-[11px] ${
                          log.tokensDelta > 0
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-white/5 text-neutral-300 border-white/10"
                        }`}
                      >
                        {log.tokensDelta > 0 ? `+${log.tokensDelta}` : log.tokensDelta} 🪙
                      </Badge>
                    )}

                    {log.priceTry && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-[11px]">
                        +{log.priceTry}₺
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const target = users.find(
                          (u) => u.username.toLowerCase() === log.username.toLowerCase()
                        );
                        if (target) setTokenModalUser(target);
                      }}
                      className="h-7 px-2.5 text-[11px] bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 rounded-lg cursor-pointer"
                    >
                      <Coins className="size-3 mr-1" /> Token Ver
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: USER MANAGEMENT & INSTANT TOKEN GRANTING
      ============================================================ */}
      {activeSubTab === "users" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 size-3.5 text-neutral-500" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Kullanıcı adı (@kael), isim veya e-posta ara..."
                className="pl-8 bg-neutral-950 border-white/15 text-xs text-white h-9 rounded-xl"
              />
            </div>

            <div className="text-xs text-neutral-400">
              İstediğin hesaba tek tıkla <strong>+Token</strong> ekleyebilir,{" "}
              <strong>VIP Paket</strong> atayabilir veya <strong>Denetim Kaydını</strong> inceleyebilirsin.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${
                  u.status === "banned"
                    ? "bg-red-950/20 border-red-500/40"
                    : u.isAdmin
                    ? "bg-amber-950/20 border-amber-500/40"
                    : "bg-neutral-900/80 border-white/10"
                }`}
              >
                {/* Left: User Identity & Live Activity */}
                <div className="flex items-start gap-4 min-w-0">
                  <Avatar className="size-14 border-2 border-purple-500/40 shrink-0">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-purple-900 font-bold">
                      {u.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-white">
                        @{u.username}
                      </span>
                      <span className="text-xs text-neutral-400">({u.displayName})</span>

                      {u.isAdmin && (
                        <Badge className="bg-amber-500 text-black font-black text-[10px]">
                          👑 ADMİN
                        </Badge>
                      )}

                      <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-[10px] uppercase">
                        Paket: {u.tier}
                      </Badge>

                      <Badge
                        className={`text-[10px] ${
                          u.status === "active"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : u.status === "muted"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        {u.status === "active"
                          ? "● Aktif"
                          : u.status === "muted"
                          ? "🔇 Susturuldu"
                          : "🚫 Banlı"}
                      </Badge>
                    </div>

                    <div className="text-xs text-purple-200 font-medium">
                      📡 Şu An Ne Yapıyor:{" "}
                      <span className="text-white font-semibold">{u.currentActivity}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400 font-mono">
                      <span>💬 {u.totalMessages} Mesaj</span>
                      <span>📞 {u.totalVoiceMinutes} dk Sesli Arama</span>
                      <span>🤖 {u.createdBotsCount} Bot</span>
                      <span>🔞 {u.isAdult ? "18+ Yetişkin" : "SFW Korumalı"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Token Balance + Quick Token & Moderation Controls */}
                <div className="flex flex-col sm:flex-row xl:items-center gap-4 shrink-0 border-t xl:border-t-0 pt-4 xl:pt-0 border-white/10">
                  {/* Current Token Box */}
                  <div className="px-4 py-2.5 rounded-2xl bg-neutral-950 border border-amber-500/35 text-right min-w-[150px]">
                    <div className="text-[10px] font-mono text-amber-300/80 uppercase">
                      Mevcut Token
                    </div>
                    <div className="text-lg font-black text-amber-300">
                      {u.tokens.toLocaleString("tr-TR")} 🪙
                    </div>
                  </div>

                  {/* Quick Token Add Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleQuickTokenAdjust(u, 1000)}
                      className="bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 text-xs font-bold h-8 px-2.5 rounded-xl cursor-pointer"
                    >
                      +1B 🪙
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuickTokenAdjust(u, 10000)}
                      className="bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 text-xs font-bold h-8 px-2.5 rounded-xl cursor-pointer"
                    >
                      +10B 🪙
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setTokenModalUser(u)}
                      className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold h-8 px-3 rounded-xl cursor-pointer"
                    >
                      <Coins className="size-3.5 mr-1" /> Özel Token
                    </Button>

                    {/* Tier Dropdown */}
                    <select
                      value={u.tier}
                      onChange={(e) => handleSetUserTier(u, e.target.value as UserTier)}
                      className="bg-neutral-950 border border-purple-500/40 rounded-xl px-2.5 h-8 text-xs text-purple-200 font-bold cursor-pointer"
                      title="VIP Üyelik Paketini Değiştir"
                    >
                      <option value="free">Paket: Free</option>
                      <option value="plus">Paket: Plus+</option>
                      <option value="pro">Paket: Pro</option>
                      <option value="sovereign">Paket: İmparator</option>
                    </select>

                    {/* Inspect User Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectedUser(u)}
                      className="border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs h-8 px-2.5 rounded-xl cursor-pointer"
                      title="Kullanıcı Detaylarını & Hareketlerini Gör"
                    >
                      <Eye className="size-3.5 mr-1" /> İncele
                    </Button>

                    {/* Mute / Ban Toggle */}
                    {u.username.toLowerCase() !== "kael" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleToggleUserStatus(
                            u,
                            u.status === "banned" ? "active" : "banned"
                          )
                        }
                        className={`h-8 px-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                          u.status === "banned"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 hover:bg-red-500/35 text-red-300"
                        }`}
                      >
                        <Ban className="size-3.5 mr-1" />
                        {u.status === "banned" ? "Banı Aç" : "Banla"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: ADMIN ACCESS PERMISSIONS (@kael + AUTHORIZED ACCOUNTS)
      ============================================================ */}
      {activeSubTab === "permissions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl border border-amber-500/35 bg-neutral-900/80 space-y-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-5 text-amber-400" />
              <h3 className="text-lg font-extrabold text-white">
                Admin Paneline Erişebilen Yetkili Hesaplar
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Bu listedeki kullanıcı adları dışında hiçbir hesap Admin Paneline erişemez.{" "}
              <code className="text-amber-300 font-bold">@kael</code> kurucu hesabı olarak kalıcı tam yetkiye sahiptir.
            </p>

            <div className="space-y-2.5 pt-2">
              {sysConfig.authorizedAdmins.map((adminUser) => (
                <div
                  key={adminUser}
                  className="p-3.5 rounded-2xl bg-neutral-950 border border-amber-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-amber-400" />
                    <span className="text-sm font-black text-white">@{adminUser}</span>
                    {adminUser === "kael" ? (
                      <Badge className="bg-amber-500 text-black text-[10px] font-black">
                        KURUCU SÜPER ADMİN (KİLİTLİ)
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-[10px]">
                        Yetkili Yönetici
                      </Badge>
                    )}
                  </div>

                  {adminUser !== "kael" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveAuthorizedAdmin(adminUser)}
                      className="text-red-400 hover:bg-red-500/20 text-xs h-8 rounded-xl cursor-pointer"
                    >
                      Yetkiyi Kaldır
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900/80 space-y-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-400" />
              <span>Yeni Hesaba Admin Yetkisi Tanımla</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Admin paneline erişmesini istediğin hesabın kullanıcı adını yazarak anında yetki verebilirsin.
            </p>

            <form onSubmit={handleAddAuthorizedAdmin} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Yetki Verilecek Kullanıcı Adı (<code>@kullanici</code>):
                </label>
                <Input
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="Örn: emre_gezgini veya moderator_1"
                  className="bg-neutral-950 border-white/15 text-xs text-white h-10"
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs h-10 px-6 rounded-xl cursor-pointer"
              >
                👑 Admin Yetkisi Ver
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: CHARACTER & BOT MODERATION
      ============================================================ */}
      {activeSubTab === "characters" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="p-4 rounded-2xl border border-white/10 bg-neutral-900/80 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <Avatar className="size-12 border border-purple-500/40 shrink-0">
                  <AvatarImage src={char.avatar_url || undefined} />
                  <AvatarFallback>{char.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{char.name}</h4>
                    <Badge
                      className={`text-[10px] ${
                        char.is_nsfw
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {char.is_nsfw ? "18+ NSFW" : "SFW"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                    {char.tagline}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-2 font-mono">
                    <span>❤️ {char.likes_count}</span>
                    <span>💬 {char.total_chats} sohbet</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!onUpdateCharacterList) return;
                    const updated = characters.map((c) =>
                      c.id === char.id ? { ...c, likes_count: c.likes_count + 250 } : c
                    );
                    onUpdateCharacterList(updated);
                    showToast(`🚀 ${char.name} karakterine +250 Vitrin Beğenisi eklendi!`);
                  }}
                  className="bg-pink-600/20 hover:bg-pink-600/35 border border-pink-500/40 text-pink-200 text-[11px] h-8 rounded-xl cursor-pointer"
                >
                  <Heart className="size-3 mr-1" /> +250 Beğeni Boost
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!onUpdateCharacterList) return;
                    const updated = characters.map((c) =>
                      c.id === char.id ? { ...c, is_nsfw: !c.is_nsfw } : c
                    );
                    onUpdateCharacterList(updated);
                    showToast(
                      `🛡️ ${char.name} yaş sınırı durumu güncellendi!`
                    );
                  }}
                  className="border-white/15 bg-white/5 text-white text-[11px] h-8 rounded-xl cursor-pointer"
                >
                  {char.is_nsfw ? "SFW Yap" : "18+ İşaretle"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          TAB 5: PROMO CODE GENERATOR & GLOBAL SYSTEM SETTINGS
      ============================================================ */}
      {activeSubTab === "promos_system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Promo Code Creator & Active Codes */}
          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900/80 space-y-5">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Ticket className="size-5 text-amber-400" />
              <span>Promosyon & Hediye Kodu Üretici</span>
            </h3>

            <form onSubmit={handleCreatePromoCode} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Kupon Kodu</label>
                <Input
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  placeholder="Örn: KAEL50K"
                  className="bg-neutral-950 border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Token Ödülü (🪙)
                </label>
                <Input
                  type="number"
                  value={newPromoTokens}
                  onChange={(e) => setNewPromoTokens(Number(e.target.value))}
                  className="bg-neutral-950 border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Ek VIP Paket Ödülü
                </label>
                <select
                  value={newPromoTier}
                  onChange={(e) => setNewPromoTier(e.target.value)}
                  className="w-full h-9 rounded-md bg-neutral-950 border border-white/15 px-3 text-xs text-white"
                >
                  <option value="none">Sadece Token</option>
                  <option value="plus">+ Plus Üyelik</option>
                  <option value="pro">+ Pro Studio Üyelik</option>
                  <option value="sovereign">+ İmparator VIP</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  Maks. Kullanım Limiti
                </label>
                <Input
                  type="number"
                  value={newPromoMaxUses}
                  onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                  className="bg-neutral-950 border-white/15 text-xs text-white"
                />
              </div>
              <div className="col-span-2 pt-1">
                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs h-9 rounded-xl cursor-pointer"
                >
                  <Plus className="size-4 mr-1" /> Yeni Promosyon Kodu Oluştur
                </Button>
              </div>
            </form>

            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="text-xs font-bold text-neutral-300">
                Aktif Promosyon Kodları:
              </div>
              {promos.map((p) => (
                <div
                  key={p.code}
                  className="p-3 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-black text-amber-300">{p.code}</span>
                    <span className="text-neutral-300 ml-2">
                      +{p.tokensReward.toLocaleString("tr-TR")} 🪙
                      {p.tierReward ? ` + ${p.tierReward.toUpperCase()}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-400">
                      {p.usedCount}/{p.maxUses} kullanım
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = promos.filter((x) => x.code !== p.code);
                        savePromoCodes(filtered);
                        setPromos(filtered);
                      }}
                      className="text-neutral-500 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Global Announcement Banner & Economy Parameters */}
          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900/80 space-y-5">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Megaphone className="size-5 text-purple-400" />
              <span>Küresel Duyuru & Sistem Ekonomisi</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Site Üstü Canlı Duyuru Metni:
                </label>
                <Input
                  value={sysConfig.announcementBanner}
                  onChange={(e) =>
                    setSysConfig({ ...sysConfig, announcementBanner: e.target.value })
                  }
                  className="bg-neutral-950 border-white/15 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-white/10">
                <span className="text-xs font-semibold text-neutral-200">
                  Duyuru Bandını Tüm Kullanıcılara Göster
                </span>
                <input
                  type="checkbox"
                  checked={sysConfig.announcementActive}
                  onChange={(e) =>
                    setSysConfig({ ...sysConfig, announcementActive: e.target.checked })
                  }
                  className="size-4 accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Yeni Üye Başlangıç Tokenı (🪙)
                  </label>
                  <Input
                    type="number"
                    value={sysConfig.defaultNewUserTokens}
                    onChange={(e) =>
                      setSysConfig({
                        ...sysConfig,
                        defaultNewUserTokens: Number(e.target.value),
                      })
                    }
                    className="bg-neutral-950 border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Sesli Arama Dakika Maliyeti (🪙)
                  </label>
                  <Input
                    type="number"
                    value={sysConfig.voiceCallTokenCost}
                    onChange={(e) =>
                      setSysConfig({
                        ...sysConfig,
                        voiceCallTokenCost: Number(e.target.value),
                      })
                    }
                    className="bg-neutral-950 border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  const saved = saveSystemConfig(sysConfig);
                  setSysConfig(saved);
                  if (onSystemConfigUpdated) onSystemConfigUpdated(saved);
                  showToast("✅ Küresel sistem ve duyuru ayarları kaydedildi!");
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
              >
                Sistem Ayarlarını Kaydet & Yayınla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: CUSTOM TOKEN GRANT / DEDUCT MODAL
      ============================================================ */}
      <AnimatePresence>
        {tokenModalUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-neutral-900 p-6 text-white shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="size-5 text-amber-400" />
                  <h3 className="text-base font-extrabold">
                    @{tokenModalUser.username} İçin Token İşlemi
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenModalUser(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Mevcut Cüzdan Bakiyesi:</span>
                <span className="text-lg font-black text-amber-300">
                  {tokenModalUser.tokens.toLocaleString("tr-TR")} 🪙
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Eklenecek / Çıkarılacak Miktar:
                  </label>
                  <Input
                    type="number"
                    value={customTokenDelta}
                    onChange={(e) => setCustomTokenDelta(Number(e.target.value))}
                    className="bg-neutral-950 border-white/15 text-sm font-bold text-amber-300"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[1000, 5000, 25000, 100000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomTokenDelta(amt)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-[11px] text-amber-200 font-mono cursor-pointer"
                      >
                        +{amt.toLocaleString("tr-TR")}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    İşlem Notu (Denetim Kaydında Görünür):
                  </label>
                  <Input
                    value={tokenGrantReason}
                    onChange={(e) => setTokenGrantReason(e.target.value)}
                    className="bg-neutral-950 border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleQuickTokenAdjust(
                      tokenModalUser,
                      -Math.abs(customTokenDelta),
                      tokenGrantReason
                    );
                    setTokenModalUser(null);
                  }}
                  className="border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  -{Math.abs(customTokenDelta).toLocaleString("tr-TR")} 🪙 Düşür
                </Button>

                <Button
                  onClick={() => {
                    handleQuickTokenAdjust(
                      tokenModalUser,
                      Math.abs(customTokenDelta),
                      tokenGrantReason
                    );
                    setTokenModalUser(null);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  +{Math.abs(customTokenDelta).toLocaleString("tr-TR")} 🪙 Gönder
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL 2: USER DEEP INSPECTOR (ACTIVITY & CHAT LOGS)
      ============================================================ */}
      <AnimatePresence>
        {inspectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl border border-purple-500/40 bg-neutral-900 p-6 text-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border border-purple-500/40">
                    <AvatarImage src={inspectedUser.avatarUrl} />
                    <AvatarFallback>{inspectedUser.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-base font-extrabold">
                      @{inspectedUser.username} — Detaylı Kullanıcı Dosyası
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {inspectedUser.email} • Katılım:{" "}
                      {new Date(inspectedUser.joinedAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedUser(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-neutral-950 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Token Bakiyesi</div>
                  <div className="text-base font-black text-amber-300">
                    {inspectedUser.tokens.toLocaleString("tr-TR")} 🪙
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Harcanan Token</div>
                  <div className="text-base font-black text-purple-300">
                    {inspectedUser.totalSpentTokens.toLocaleString("tr-TR")} 🪙
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Envanter Eşyası</div>
                  <div className="text-base font-black text-emerald-300">
                    {inspectedUser.ownedItemIds?.length || 0} Adet
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                <div className="text-xs font-bold text-neutral-300 uppercase">
                  Son Hareketleri ve Sohbet Kayıtları:
                </div>
                {logs
                  .filter(
                    (l) => l.username.toLowerCase() === inspectedUser.username.toLowerCase()
                  )
                  .map((l) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-2xl bg-neutral-950 border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300">{l.actionTitle}</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(l.timestamp).toLocaleTimeString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300">{l.details}</p>
                      {l.messageSnippet && (
                        <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200 font-mono">
                          &ldquo;{l.messageSnippet}&rdquo;
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
