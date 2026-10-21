/**
 * KAEL-AI: ECONOMY, TOKEN WALLET, STORE CATALOG & ADMIN TELEMETRY SERVICE
 * Powers:
 * 1. Role-based Admin Authorization (@kael + dynamic authorized admins)
 * 2. Real-time User Activity & Audit Log Stream (Chats, Voice Calls, Forge, Purchases, Moderation)
 * 3. Token Wallet, VIP Subscriptions, Store Items & Promo Codes
 */

export type UserTier = "free" | "plus" | "pro" | "sovereign";

export interface PlatformUserRecord {
  id: string;
  username: string; // without @, lowercase
  displayName: string;
  email: string;
  avatarUrl: string;
  tier: UserTier;
  tokens: number;
  totalSpentTokens: number;
  totalMessages: number;
  totalVoiceMinutes: number;
  createdBotsCount: number;
  isAdmin: boolean;
  isAdult: boolean;
  nsfwEnabled: boolean;
  status: "active" | "muted" | "banned";
  lastActiveAt: string;
  currentActivity: string;
  activeCharacterName?: string;
  ownedItemIds: string[];
  equippedBadge?: string;
  joinedAt: string;
}

export type ActivityCategory =
  | "chat"
  | "voice"
  | "store"
  | "forge"
  | "admin"
  | "security"
  | "rpg";

export interface PlatformActivityLog {
  id: string;
  timestamp: string;
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
  ipMask?: string;
  severity: "info" | "success" | "warning" | "critical";
}

export interface PromoCodeRecord {
  code: string;
  tokensReward: number;
  tierReward?: UserTier;
  maxUses: number;
  usedCount: number;
  usedByUsernames: string[];
  isActive: boolean;
  createdAt: string;
}

export interface SystemGlobalConfig {
  maintenanceMode: boolean;
  announcementBanner: string;
  announcementActive: boolean;
  defaultNewUserTokens: number;
  chatMessageTokenCost: number;
  voiceCallTokenCost: number;
  imageGenTokenCost: number;
  globalNsfwAllowed: boolean;
  authorizedAdmins: string[]; // lowercase usernames, always includes "kael"
}

export interface TokenPackItem {
  id: string;
  name: string;
  tokens: number;
  bonusTokens: number;
  priceTry: number;
  badge?: string;
  popular?: boolean;
  icon: string;
  gradient: string;
}

export interface VipPlanItem {
  id: UserTier;
  name: string;
  tagline: string;
  monthlyPriceTry: number;
  yearlyPriceTry: number;
  monthlyTokens: number;
  badge: string;
  popular?: boolean;
  features: string[];
  gradient: string;
}

export interface StoreCatalogItem {
  id: string;
  name: string;
  category: "affection" | "rpg" | "cosmetic" | "boost";
  description: string;
  tokenCost: number;
  icon: string;
  badge?: string;
  effectLabel: string;
  affectionBoost?: number;
  rpgGoldBoost?: number;
  profileBadge?: string;
}

// ============================================================
// CONSTANTS & STORE CATALOGS
// ============================================================

export const STORAGE_KEYS = {
  USERS: "kael_platform_users_v1",
  LOGS: "kael_platform_activity_logs_v1",
  PROMOS: "kael_platform_promo_codes_v1",
  CONFIG: "kael_platform_system_config_v1",
};

export const DEFAULT_SYSTEM_CONFIG: SystemGlobalConfig = {
  maintenanceMode: false,
  announcementBanner:
    "🎉 Kael-AI 2.5 Güncellemesi Yayında! 14 Yeni Neural Anime/Türkçe Ses ve Kael Mağaza Sistemi Aktif!",
  announcementActive: true,
  defaultNewUserTokens: 100,
  chatMessageTokenCost: 1,
  voiceCallTokenCost: 5,
  imageGenTokenCost: 10,
  globalNsfwAllowed: true,
  authorizedAdmins: ["kael"],
};

export const VIP_PLANS: VipPlanItem[] = [
  {
    id: "free",
    name: "Gezgin (Başlangıç)",
    tagline: "Kael-AI dünyasını keşfetmek isteyenler için",
    monthlyPriceTry: 0,
    yearlyPriceTry: 0,
    monthlyTokens: 100,
    badge: "🌱 Ücretsiz",
    features: [
      "Başlangıçta 100 🪙 Kael Token Hediye",
      "Standart AI Rol Yapma Modelleri",
      "14 Neural Karakter Sesi Önizleme",
      "Çoklu AI Grup Odalarına Katılım",
      "Temel Karakter Yaratma (Atölye)",
    ],
    gradient: "from-neutral-900 to-neutral-950 border-white/10",
  },
  {
    id: "plus",
    name: "Kael Plus+",
    tagline: "Daha uzun sohbetler ve sesli mesajlaşma tutkusu için",
    monthlyPriceTry: 89,
    yearlyPriceTry: 790,
    monthlyTokens: 6000,
    badge: "⚡ PLUS",
    features: [
      "Her Ay 6.000 🪙 Kael Token Yüklemesi",
      "Tüm 14 Neural Anime & Türkçe Sese Tam Erişim",
      "2x Uzun Dönem Karakter Hafızası (RAG)",
      "Mesajlarda Sınırsız Seslendirme (🔊)",
      "Profilinde Özel '⚡ PLUS' Parlayan Rozet",
    ],
    gradient: "from-blue-950/60 via-indigo-950/40 to-neutral-950 border-blue-500/40",
  },
  {
    id: "pro",
    name: "Kael Pro Studio",
    tagline: "Canlı telefon araması, HD sahne çizimi ve derin RP için",
    monthlyPriceTry: 189,
    yearlyPriceTry: 1690,
    monthlyTokens: 20000,
    badge: "🔥 EN POPÜLER",
    popular: true,
    features: [
      "Her Ay 20.000 🪙 Kael Token Yüklemesi",
      "Sınırsız Canlı Telefon Araması (📞 Sesli Ara 2.0)",
      "Ultra-RP Beyin Modelleri (Claude 3.5 / GPT-4o / DeepSeek)",
      "Sohbet İçi HD Anlık Sahne Çizdirme",
      "Sınırsız Persona & Özel Karakter Üretimi",
      "Profilinde '🔥 PRO STUDIO' Efsanevi Rozeti",
    ],
    gradient: "from-purple-950/80 via-pink-950/50 to-neutral-950 border-purple-500/60",
  },
  {
    id: "sovereign",
    name: "Kael İmparator (Sovereign)",
    tagline: "Sınırları tamamen kaldıran VIP kurucu paketi",
    monthlyPriceTry: 399,
    yearlyPriceTry: 3490,
    monthlyTokens: 75000,
    badge: "👑 İMPARATOR VIP",
    features: [
      "Her Ay 75.000 🪙 Token + Mesajlarda 0 Token Tüketimi",
      "Öncelikli VIP Sunucu & Sıfır Bekleme Süresi",
      "Kendi Karakterlerini Keşfet Vitrininde Öne Çıkarma",
      "Tüm RPG Eşyalarında ve Hediyelerde %50 İndirim",
      "Özel '👑 İMPARATOR' Altın Profil Çerçevesi & Ünvanı",
      "Erken Erişim: Yeni AI Modelleri ve Özel Sesler",
    ],
    gradient: "from-amber-950/70 via-yellow-950/40 to-neutral-950 border-amber-500/60",
  },
];

export const TOKEN_PACKS: TokenPackItem[] = [
  {
    id: "pack-starter",
    name: "Başlangıç Kesesi",
    tokens: 1000,
    bonusTokens: 0,
    priceTry: 29,
    icon: "🪙",
    gradient: "from-neutral-900 to-neutral-950 border-white/15",
  },
  {
    id: "pack-adventurer",
    name: "Maceracı Sandığı",
    tokens: 3500,
    bonusTokens: 500,
    priceTry: 79,
    badge: "+500 Bonus",
    icon: "💰",
    gradient: "from-blue-950/50 to-neutral-950 border-blue-500/35",
  },
  {
    id: "pack-guild",
    name: "Lonca Hazinesi",
    tokens: 10000,
    bonusTokens: 2500,
    priceTry: 179,
    badge: "🔥 En Çok Satan",
    popular: true,
    icon: "💎",
    gradient: "from-purple-950/60 via-pink-950/40 to-neutral-950 border-purple-500/50",
  },
  {
    id: "pack-dragon",
    name: "Ejderha Mahzeni",
    tokens: 30000,
    bonusTokens: 10000,
    priceTry: 399,
    badge: "+10.000 Bonus",
    icon: "👑",
    gradient: "from-amber-950/60 to-neutral-950 border-amber-500/50",
  },
  {
    id: "pack-eternal",
    name: "Kael Efsanevi Kasa",
    tokens: 100000,
    bonusTokens: 50000,
    priceTry: 999,
    badge: "%50 Bedava Bonus",
    icon: "🌌",
    gradient: "from-emerald-950/60 via-teal-950/40 to-neutral-950 border-emerald-500/50",
  },
];

export const STORE_CATALOG_ITEMS: StoreCatalogItem[] = [
  // 1. Affection / Relationship Gifts
  {
    id: "gift-midnight-rose",
    name: "Büyülü Gece Gülü",
    category: "affection",
    description:
      "Karakterine parlayan bir gece gülü hediye et. Sohbetteki samimiyet ve hoşlanma puanını anında artırır.",
    tokenCost: 150,
    icon: "🌹",
    badge: "Romantik Hediye",
    effectLabel: "+15 İlişki (Affection) Puanı",
    affectionBoost: 15,
  },
  {
    id: "gift-crystal-musicbox",
    name: "Kristal Melodi Kutusu",
    category: "affection",
    description:
      "Nadir bulunan büyülü bir müzik kutusu. Tsundere veya soğuk karakterlerin bile kalbini yumuşatır.",
    tokenCost: 350,
    icon: "🎶",
    badge: "Etkileyici",
    effectLabel: "+35 İlişki Puanı & Özel Tepki",
    affectionBoost: 35,
  },
  {
    id: "gift-soulmate-ring",
    name: "Ebedi Bağ Yüzüğü (Ruh Eşi)",
    category: "affection",
    description:
      "Karakterle arandaki bağı anında %100 Maksimum (Ruh Eşi) seviyesine çıkarır ve gizli diyalogları açar.",
    tokenCost: 900,
    icon: "💍",
    badge: "Efsanevi",
    effectLabel: "%100 Maksimum İlişki Kilidi",
    affectionBoost: 100,
  },

  // 2. RPG & Simulation Boosters
  {
    id: "rpg-gold-chest",
    name: "5.000 RPG Altın Hazinesi",
    category: "rpg",
    description:
      "Sohbet içi RPG envanterine anında 5.000 Altın ekler. Tüccarlardan eşya almak ve lonca kurmak için ideal.",
    tokenCost: 200,
    icon: "🪙",
    badge: "RPG Ekonomi",
    effectLabel: "+5.000 RPG Envanter Altını",
    rpgGoldBoost: 5000,
  },
  {
    id: "rpg-fate-dice",
    name: "Kadim D20 Kader Zarı",
    category: "rpg",
    description:
      "Kritik başarı şansını artıran efsanevi D20 zar seti. Zindan Efendisi senaryolarında avantaj sağlar.",
    tokenCost: 250,
    icon: "🎲",
    badge: "Şans Aurası",
    effectLabel: "D20 Zarlarında Kritik Şans",
    rpgGoldBoost: 1000,
  },
  {
    id: "rpg-mind-key",
    name: "Zihin & Gizli Sırlar Anahtarı",
    category: "rpg",
    description:
      "Karakterin en derin sırlarını, sakladığı geçmişini ve sana karşı gerçek düşüncelerini ortaya çıkarır.",
    tokenCost: 400,
    icon: "🗝️",
    badge: "Lore Açıcı",
    effectLabel: "Gizli Karakter Sırlarını Aç",
    affectionBoost: 20,
  },

  // 3. Cosmetics & Profile Badges
  {
    id: "cosmetic-sakura-aura",
    name: "Sakura Waifu Profil Aurası",
    category: "cosmetic",
    description:
      "Profiline ve sohbet balonlarına kiraz çiçeği parıltısı ile '🌸 Sakura' özel ünvanı ekler.",
    tokenCost: 300,
    icon: "🌸",
    badge: "Kozmetik",
    effectLabel: "'🌸 Sakura' Profil Rozeti",
    profileBadge: "🌸 Sakura Efsanesi",
  },
  {
    id: "cosmetic-cyber-neon",
    name: "Cyberpunk Neon Kalkanı",
    category: "cosmetic",
    description:
      "Gece Şehri avcılarına özel hologramik neon rozet ve yüksek teknoloji profil ünvanı.",
    tokenCost: 350,
    icon: "⚡",
    badge: "Kozmetik",
    effectLabel: "'⚡ Cyber-Hunter' Rozeti",
    profileBadge: "⚡ Cyber-Hunter",
  },
  {
    id: "cosmetic-crimson-lord",
    name: "Kızıl İmparatorluk Tacı",
    category: "cosmetic",
    description:
      "Topluluk içinde seçkinliğini gösteren nadir '👑 Kızıl Lord' profil rozeti ve vitrin etiketi.",
    tokenCost: 600,
    icon: "👑",
    badge: "Nadir",
    effectLabel: "'👑 Kızıl Lord' VIP Rozeti",
    profileBadge: "👑 Kızıl Lord",
  },

  // 4. Creator / Bot Boosts
  {
    id: "boost-spotlight-bot",
    name: "Keşfet Vitrin Boost (+500 Beğeni)",
    category: "boost",
    description:
      "Atölyede oluşturduğun karakterleri Keşfet sayfasında üst sıralara taşır ve +500 organik etkileşim kazandırır.",
    tokenCost: 500,
    icon: "🚀",
    badge: "Yaratıcı Boost",
    effectLabel: "Karakter Vitrini Öne Çıkarma",
  },
];

// ============================================================
// SEEDED USERS, LOGS & PROMO CODES
// ============================================================

export const SEEDED_USERS: PlatformUserRecord[] = [
  {
    id: "user-kael-founder",
    username: "kael",
    displayName: "Kael (Kurucu & Baş Yönetici)",
    email: "kael@kael.ai",
    avatarUrl: "/avatars/kaito.jpg",
    tier: "sovereign",
    tokens: 999999,
    totalSpentTokens: 42500,
    totalMessages: 1420,
    totalVoiceMinutes: 310,
    createdBotsCount: 18,
    isAdmin: true,
    isAdult: true,
    nsfwEnabled: true,
    status: "active",
    lastActiveAt: new Date().toISOString(),
    currentActivity: "🛡️ Admin Paneli & Sistem Telemetrisini İzliyor",
    activeCharacterName: "Yuki (Tsundere Anime Kız)",
    ownedItemIds: [
      "cosmetic-crimson-lord",
      "gift-soulmate-ring",
      "rpg-fate-dice",
    ],
    equippedBadge: "👑 Kurucu Admin",
    joinedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-emre-rp",
    username: "emre_gezgini",
    displayName: "Emre Yıldırım",
    email: "emre@gmail.com",
    avatarUrl: "/avatars/komiser-boz.jpg",
    tier: "pro",
    tokens: 14850,
    totalSpentTokens: 8400,
    totalMessages: 486,
    totalVoiceMinutes: 84,
    createdBotsCount: 4,
    isAdmin: false,
    isAdult: true,
    nsfwEnabled: true,
    status: "active",
    lastActiveAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    currentActivity: "📞 Yuki ile Canlı Sesli Aramada (Neural Ses: Yuki)",
    activeCharacterName: "Yuki",
    ownedItemIds: ["gift-midnight-rose", "cosmetic-cyber-neon"],
    equippedBadge: "🔥 PRO STUDIO",
    joinedAt: "2026-06-14T12:20:00.000Z",
  },
  {
    id: "user-selin-chan",
    username: "selin_chan",
    displayName: "Selin Aksoy",
    email: "selin@outlook.com",
    avatarUrl: "/avatars/yuki.jpg",
    tier: "plus",
    tokens: 4320,
    totalSpentTokens: 3100,
    totalMessages: 312,
    totalVoiceMinutes: 42,
    createdBotsCount: 6,
    isAdmin: false,
    isAdult: true,
    nsfwEnabled: false,
    status: "active",
    lastActiveAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    currentActivity: "💬 Kaito ile Fantastik RPG Sohbetinde (D20 Zar Attı: 19)",
    activeCharacterName: "Kaito",
    ownedItemIds: ["cosmetic-sakura-aura"],
    equippedBadge: "🌸 Sakura Efsanesi",
    joinedAt: "2026-08-02T16:10:00.000Z",
  },
  {
    id: "user-berk-cyber",
    username: "berk_x99",
    displayName: "Berkay Demir",
    email: "berkay@kael.ai",
    avatarUrl: "/avatars/luna.jpg",
    tier: "free",
    tokens: 180,
    totalSpentTokens: 820,
    totalMessages: 94,
    totalVoiceMinutes: 8,
    createdBotsCount: 1,
    isAdmin: false,
    isAdult: false,
    nsfwEnabled: false,
    status: "active",
    lastActiveAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    currentActivity: "🔨 Atölyede Yeni Furry/Fursona Karakter Tasarlıyor",
    activeCharacterName: "Komiser Boz",
    ownedItemIds: [],
    joinedAt: "2026-09-19T19:45:00.000Z",
  },
  {
    id: "user-zeynep-art",
    username: "zeynep_nocturne",
    displayName: "Zeynep Kaya",
    email: "zeynep@studio.tr",
    avatarUrl: "/avatars/aria.jpg",
    tier: "sovereign",
    tokens: 68400,
    totalSpentTokens: 21600,
    totalMessages: 910,
    totalVoiceMinutes: 195,
    createdBotsCount: 9,
    isAdmin: false,
    isAdult: true,
    nsfwEnabled: true,
    status: "active",
    lastActiveAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    currentActivity: "💎 Mağazadan 'Ebedi Bağ Yüzüğü' ve 'Lonca Hazinesi' Satın Aldı",
    activeCharacterName: "Lilith",
    ownedItemIds: ["gift-soulmate-ring", "cosmetic-crimson-lord"],
    equippedBadge: "👑 İMPARATOR VIP",
    joinedAt: "2026-04-10T09:00:00.000Z",
  },
  {
    id: "user-troll-99",
    username: "dark_spammer",
    displayName: "Gölge Hesap",
    email: "spam@temp.org",
    avatarUrl: "/avatars/kaito.jpg",
    tier: "free",
    tokens: 0,
    totalSpentTokens: 450,
    totalMessages: 37,
    totalVoiceMinutes: 0,
    createdBotsCount: 0,
    isAdmin: false,
    isAdult: false,
    nsfwEnabled: false,
    status: "muted",
    lastActiveAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    currentActivity: "🚫 Yaş Doğrulama (SFW) Filtresine Takıldı",
    activeCharacterName: "Aria",
    ownedItemIds: [],
    joinedAt: "2026-10-15T21:00:00.000Z",
  },
];

export const SEEDED_ACTIVITY_LOGS: PlatformActivityLog[] = [
  {
    id: "log-101",
    timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
    username: "emre_gezgini",
    displayName: "Emre Yıldırım",
    avatarUrl: "/avatars/komiser-boz.jpg",
    category: "voice",
    actionTitle: "Canlı Sesli Arama & Neural TTS",
    details:
      "Yuki ile 4 dk 12 sn sesli görüşme yaptı. Ses: 'anime-girl-yuki' (Groq Whisper STT + Pollinations Neural TTS).",
    characterName: "Yuki",
    messageSnippet:
      "Senpai! Bugün akademide beni neden beklemedin? B-beni yanlış anlama, sadece merak ettim!",
    tokensDelta: -5,
    ipMask: "88.241.***.12",
    severity: "info",
  },
  {
    id: "log-102",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    username: "zeynep_nocturne",
    displayName: "Zeynep Kaya",
    avatarUrl: "/avatars/aria.jpg",
    category: "store",
    actionTitle: "Token Paketi & VIP Eşya Satın Alımı",
    details:
      "'Lonca Hazinesi (12.500 🪙)' paketini satın aldı ve Lilith için 'Ebedi Bağ Yüzüğü' hediye etti.",
    characterName: "Lilith",
    tokensDelta: 12500,
    priceTry: 179,
    ipMask: "176.88.***.94",
    severity: "success",
  },
  {
    id: "log-103",
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    username: "selin_chan",
    displayName: "Selin Aksoy",
    avatarUrl: "/avatars/yuki.jpg",
    category: "rpg",
    actionTitle: "D20 Zar & RPG Sahne Çizimi",
    details:
      "Kaito sohbetinde D20 zar attı (Sonuç: 19 - Kritik Başarı!) ve 'Gecekondu Çatısı' sahnesini çizdirdi.",
    characterName: "Kaito",
    messageSnippet:
      "Kılıcımı kınından çekip çatıdaki gölge suikastçının önüne atlıyorum! [D20: 19]",
    tokensDelta: -15,
    ipMask: "95.70.***.41",
    severity: "info",
  },
  {
    id: "log-104",
    timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    username: "berk_x99",
    displayName: "Berkay Demir",
    avatarUrl: "/avatars/luna.jpg",
    category: "forge",
    actionTitle: "Atölyede Yeni Karakter Üretildi",
    details:
      "'Komiser Pençe (Furry Dedektif)' adlı yeni bir karakter oluşturdu ve Keşfet vitrininde yayınladı.",
    characterName: "Komiser Pençe",
    tokensDelta: -10,
    ipMask: "31.145.***.80",
    severity: "success",
  },
  {
    id: "log-105",
    timestamp: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    username: "dark_spammer",
    displayName: "Gölge Hesap",
    avatarUrl: "/avatars/kaito.jpg",
    category: "security",
    actionTitle: "18+ Yaş Filtresi (Age-Gate) Engellemesi",
    details:
      "18 yaş altı hesap ile NSFW etiketli bota erişmeye çalıştı. Sistem otomatik olarak SFW korumasını devreye soktu.",
    characterName: "Lilith",
    ipMask: "185.22.***.09",
    severity: "warning",
  },
  {
    id: "log-106",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    username: "kael",
    displayName: "Kael (Kurucu & Baş Yönetici)",
    avatarUrl: "/avatars/kaito.jpg",
    category: "admin",
    actionTitle: "Sistem & Ses Motoru Güncellendi",
    details:
      "@kael kurucu yetkisiyle 14 Neural Ses kütüphanesini ve Kael Token Mağazasını aktif etti.",
    tokensDelta: 0,
    ipMask: "127.0.0.1",
    severity: "success",
  },
];

export const SEEDED_PROMO_CODES: PromoCodeRecord[] = [
  {
    code: "KAEL2026",
    tokensReward: 2500,
    maxUses: 500,
    usedCount: 42,
    usedByUsernames: [],
    isActive: true,
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    code: "ANIMEVIP",
    tokensReward: 5000,
    tierReward: "plus",
    maxUses: 100,
    usedCount: 19,
    usedByUsernames: [],
    isActive: true,
    createdAt: "2026-10-12T14:30:00.000Z",
  },
  {
    code: "KURUCU10K",
    tokensReward: 10000,
    tierReward: "pro",
    maxUses: 25,
    usedCount: 3,
    usedByUsernames: [],
    isActive: true,
    createdAt: "2026-10-19T18:00:00.000Z",
  },
];

// ============================================================
// HELPER FUNCTIONS (CLIENT + LOCAL STORAGE SYNCHRONIZED)
// ============================================================

export function getSystemConfig(): SystemGlobalConfig {
  if (typeof window === "undefined") return DEFAULT_SYSTEM_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const admins = Array.from(
        new Set(["kael", ...(parsed.authorizedAdmins || [])].map((u: string) => u.toLowerCase()))
      );
      return { ...DEFAULT_SYSTEM_CONFIG, ...parsed, authorizedAdmins: admins };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SYSTEM_CONFIG;
}

export function saveSystemConfig(next: SystemGlobalConfig): SystemGlobalConfig {
  const cleanAdmins = Array.from(
    new Set(["kael", ...(next.authorizedAdmins || [])].map((u) => u.replace(/^@/, "").trim().toLowerCase()).filter(Boolean))
  );
  const finalConfig: SystemGlobalConfig = {
    ...next,
    authorizedAdmins: cleanAdmins,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(finalConfig));
    } catch {
      // ignore
    }
  }
  return finalConfig;
}

export function isUserAuthorizedAdmin(username?: string | null): boolean {
  if (!username) return false;
  const clean = username.replace(/^@/, "").trim().toLowerCase();
  if (clean === "kael") return true;
  const config = getSystemConfig();
  return config.authorizedAdmins.includes(clean);
}

export function getPlatformUsers(): PlatformUserRecord[] {
  if (typeof window === "undefined") return SEEDED_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) {
      const parsed: PlatformUserRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure @kael always exists and has admin rights
        const hasKael = parsed.some((u) => u.username.toLowerCase() === "kael");
        if (!hasKael) {
          return [SEEDED_USERS[0], ...parsed];
        }
        return parsed.map((u) =>
          u.username.toLowerCase() === "kael" ? { ...u, isAdmin: true } : u
        );
      }
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEEDED_USERS));
  } catch {
    // ignore
  }
  return SEEDED_USERS;
}

export function savePlatformUsers(users: PlatformUserRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    window.dispatchEvent(new Event("kael_economy_updated"));
  } catch {
    // ignore
  }
}

export function ensureSessionUserInPlatform(session: {
  userId?: string;
  username: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string;
  isAdult?: boolean;
  nsfwEnabled?: boolean;
}): PlatformUserRecord {
  const cleanUsername = (session.username || "misafir").replace(/^@/, "").trim().toLowerCase();
  const users = getPlatformUsers();
  const config = getSystemConfig();
  const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (existing) {
    const shouldBeAdmin =
      cleanUsername === "kael" || config.authorizedAdmins.includes(cleanUsername) || existing.isAdmin;
    if (shouldBeAdmin !== existing.isAdmin) {
      const updated = users.map((u) =>
        u.username.toLowerCase() === cleanUsername ? { ...u, isAdmin: shouldBeAdmin } : u
      );
      savePlatformUsers(updated);
      return { ...existing, isAdmin: shouldBeAdmin };
    }
    return existing;
  }

  const newUser: PlatformUserRecord = {
    id: session.userId || `user-${Date.now()}`,
    username: cleanUsername,
    displayName: session.displayName || cleanUsername,
    email: session.email || `${cleanUsername}@kael.ai`,
    avatarUrl: session.avatarUrl || "/avatars/yuki.jpg",
    tier: cleanUsername === "kael" ? "sovereign" : "free",
    tokens: cleanUsername === "kael" ? 999999 : config.defaultNewUserTokens,
    totalSpentTokens: 0,
    totalMessages: 0,
    totalVoiceMinutes: 0,
    createdBotsCount: 0,
    isAdmin: cleanUsername === "kael" || config.authorizedAdmins.includes(cleanUsername),
    isAdult: Boolean(session.isAdult),
    nsfwEnabled: Boolean(session.nsfwEnabled),
    status: "active",
    lastActiveAt: new Date().toISOString(),
    currentActivity: "🌟 Platformda Geziniyor",
    ownedItemIds: [],
    equippedBadge: cleanUsername === "kael" ? "👑 Kurucu Admin" : undefined,
    joinedAt: new Date().toISOString(),
  };

  const nextUsers = [newUser, ...users];
  savePlatformUsers(nextUsers);
  return newUser;
}

export function adjustUserTokens(
  username: string,
  deltaTokens: number,
  reasonTitle: string,
  reasonDetails: string,
  category: ActivityCategory = "store",
  priceTry?: number
): PlatformUserRecord | null {
  const clean = username.replace(/^@/, "").trim().toLowerCase();
  const users = getPlatformUsers();
  let updatedUser: PlatformUserRecord | null = null;

  const nextUsers = users.map((u) => {
    if (u.username.toLowerCase() === clean) {
      const nextTokens = Math.max(0, u.tokens + deltaTokens);
      const nextSpent =
        deltaTokens < 0 ? u.totalSpentTokens + Math.abs(deltaTokens) : u.totalSpentTokens;
      updatedUser = {
        ...u,
        tokens: nextTokens,
        totalSpentTokens: nextSpent,
        lastActiveAt: new Date().toISOString(),
        currentActivity: reasonTitle,
      };
      return updatedUser;
    }
    return u;
  });

  if (updatedUser) {
    savePlatformUsers(nextUsers);
    recordPlatformActivity({
      username: (updatedUser as PlatformUserRecord).username,
      displayName: (updatedUser as PlatformUserRecord).displayName,
      avatarUrl: (updatedUser as PlatformUserRecord).avatarUrl,
      category,
      actionTitle: reasonTitle,
      details: reasonDetails,
      tokensDelta: deltaTokens,
      priceTry,
      severity: deltaTokens >= 0 ? "success" : "info",
    });
  }

  return updatedUser;
}

export function getActivityLogs(): PlatformActivityLog[] {
  if (typeof window === "undefined") return SEEDED_ACTIVITY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) {
      const parsed: PlatformActivityLog[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEEDED_ACTIVITY_LOGS));
  } catch {
    // ignore
  }
  return SEEDED_ACTIVITY_LOGS;
}

export function recordPlatformActivity(params: {
  username: string;
  displayName: string;
  avatarUrl?: string;
  category: ActivityCategory;
  actionTitle: string;
  details: string;
  characterName?: string;
  messageSnippet?: string;
  tokensDelta?: number;
  priceTry?: number;
  severity?: "info" | "success" | "warning" | "critical";
}): PlatformActivityLog {
  const newLog: PlatformActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    username: params.username.replace(/^@/, "").toLowerCase(),
    displayName: params.displayName,
    avatarUrl: params.avatarUrl || "/avatars/yuki.jpg",
    category: params.category,
    actionTitle: params.actionTitle,
    details: params.details,
    characterName: params.characterName,
    messageSnippet: params.messageSnippet,
    tokensDelta: params.tokensDelta,
    priceTry: params.priceTry,
    ipMask: "88.241.***.42",
    severity: params.severity || "info",
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getActivityLogs();
      const updated = [newLog, ...existing].slice(0, 120);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
      window.dispatchEvent(new Event("kael_economy_updated"));
    } catch {
      // ignore
    }
  }
  return newLog;
}

export function getPromoCodes(): PromoCodeRecord[] {
  if (typeof window === "undefined") return SEEDED_PROMO_CODES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(STORAGE_KEYS.PROMOS, JSON.stringify(SEEDED_PROMO_CODES));
  } catch {
    // ignore
  }
  return SEEDED_PROMO_CODES;
}

export function savePromoCodes(codes: PromoCodeRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROMOS, JSON.stringify(codes));
    window.dispatchEvent(new Event("kael_economy_updated"));
  } catch {
    // ignore
  }
}

export function redeemPromoCode(
  codeInput: string,
  username: string
): { success: boolean; message: string; tokensAdded?: number; newTier?: UserTier } {
  const cleanCode = codeInput.trim().toUpperCase();
  const cleanUser = username.replace(/^@/, "").trim().toLowerCase();

  if (!cleanCode) {
    return { success: false, message: "⚠️ Lütfen bir promosyon kodu girin." };
  }

  const promos = getPromoCodes();
  const target = promos.find((p) => p.code.toUpperCase() === cleanCode);

  if (!target || !target.isActive) {
    return {
      success: false,
      message: "❌ Geçersiz veya süresi dolmuş promosyon kodu!",
    };
  }

  if (target.usedCount >= target.maxUses) {
    return {
      success: false,
      message: "❌ Bu promosyon kodunun kullanım limiti dolmuş.",
    };
  }

  if (target.usedByUsernames.includes(cleanUser)) {
    return {
      success: false,
      message: "⚠️ Bu promosyon kodunu zaten hesabınızda kullandınız!",
    };
  }

  // Update promo record
  const nextPromos = promos.map((p) =>
    p.code.toUpperCase() === cleanCode
      ? {
          ...p,
          usedCount: p.usedCount + 1,
          usedByUsernames: [...p.usedByUsernames, cleanUser],
        }
      : p
  );
  savePromoCodes(nextPromos);

  // Credit user
  const users = getPlatformUsers();
  const nextUsers = users.map((u) => {
    if (u.username.toLowerCase() === cleanUser) {
      return {
        ...u,
        tokens: u.tokens + target.tokensReward,
        tier: target.tierReward || u.tier,
        lastActiveAt: new Date().toISOString(),
        currentActivity: `🎁 '${cleanCode}' Promosyon Kodunu Kullandı (+${target.tokensReward} 🪙)`,
      };
    }
    return u;
  });
  savePlatformUsers(nextUsers);

  recordPlatformActivity({
    username: cleanUser,
    displayName: `@${cleanUser}`,
    category: "store",
    actionTitle: `Promosyon Kodu Kullanıldı (${cleanCode})`,
    details: `@${cleanUser} hesabı '${cleanCode}' kodunu kullanarak +${target.tokensReward.toLocaleString("tr-TR")} 🪙 kazandı!`,
    tokensDelta: target.tokensReward,
    severity: "success",
  });

  return {
    success: true,
    message: `🎉 Tebrikler! '${cleanCode}' koduyla hesabınıza +${target.tokensReward.toLocaleString("tr-TR")} 🪙 Kael Token${
      target.tierReward ? ` ve ${target.tierReward.toUpperCase()} VIP üyeliği` : ""
    } tanımlandı!`,
    tokensAdded: target.tokensReward,
    newTier: target.tierReward,
  };
}
