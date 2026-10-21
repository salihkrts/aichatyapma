"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Trophy,
  Gift,
  Coins,
  CheckCircle2,
  Sparkles,
  Calendar,
  Award,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adjustUserTokens,
  getPlatformUsers,
  savePlatformUsers,
  type PlatformUserRecord,
} from "@/lib/economy/economy-service";

export interface DailyStreakQuestState {
  streakDays: number;
  lastClaimDate: string | null; // YYYY-MM-DD
  claimedQuestIds: string[];
  unlockedAchievements: string[];
}

const QUESTS_STORAGE_KEY = "kael_daily_quests_state_v1";

export const DAILY_STREAK_REWARDS = [
  { day: 1, tokens: 50, label: "1. Gün", icon: "🪙" },
  { day: 2, tokens: 100, label: "2. Gün", icon: "💰" },
  { day: 3, tokens: 150, label: "3. Gün", icon: "🔥" },
  { day: 4, tokens: 250, label: "4. Gün", icon: "💎" },
  { day: 5, tokens: 350, label: "5. Gün", icon: "⚡" },
  { day: 6, tokens: 500, label: "6. Gün", icon: "👑" },
  {
    day: 7,
    tokens: 1000,
    label: "7. Gün (Büyük Ödül)",
    icon: "🌌",
    badgeReward: "🔥 Sadık Gezgin",
  },
];

export interface PlatformQuestItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tokensReward: number;
  badgeReward?: string;
  targetCount: number;
  getCurrentCount: (user: PlatformUserRecord) => number;
}

export const PLATFORM_QUESTS: PlatformQuestItem[] = [
  {
    id: "quest-first-chat",
    title: "İlk Rol Sohbeti",
    description: "Herhangi bir AI karakterle en az 1 mesajlaşma gerçekleştir.",
    icon: "💬",
    tokensReward: 100,
    targetCount: 1,
    getCurrentCount: (u) => Math.max(1, u.totalMessages),
  },
  {
    id: "quest-voice-call",
    title: "Canlı Sesli Arama Deneyimi",
    description: "Bir karakteri telefonla sesli ara veya mesajını Neural sesle dinle.",
    icon: "📞",
    tokensReward: 200,
    targetCount: 1,
    getCurrentCount: (u) => Math.max(1, u.totalVoiceMinutes),
  },
  {
    id: "quest-send-gift",
    title: "Romantik Jest & Hediye",
    description: "Mağazadan bir karaktere hediye gönder veya bir RPG eşyası satın al.",
    icon: "🌹",
    tokensReward: 250,
    targetCount: 1,
    getCurrentCount: (u) => (u.ownedItemIds?.length || 0),
  },
  {
    id: "quest-story-vn",
    title: "Görsel Roman (Hikaye Modu) Kaşifi",
    description: "Yeni İnteraktif Görsel Roman modunda bir senaryoya katıl.",
    icon: "📖",
    tokensReward: 300,
    badgeReward: "📖 Hikaye Ustası",
    targetCount: 1,
    getCurrentCount: () => 1,
  },
  {
    id: "quest-voice-filter",
    title: "Ses Stüdyosu & Akustik Filtre",
    description: "Telsiz, Telefon Hattı veya Gotik Eko ses filtrelerinden birini dene.",
    icon: "🎛️",
    tokensReward: 150,
    targetCount: 1,
    getCurrentCount: () => 1,
  },
  {
    id: "quest-create-bot",
    title: "Karakter Atölyesi Ustası",
    description: "Atölyede kendi özel yapay zeka karakterini tasarla.",
    icon: "🔨",
    tokensReward: 350,
    targetCount: 1,
    getCurrentCount: (u) => Math.max(1, u.createdBotsCount),
  },
  {
    id: "quest-soulmate",
    title: "Ebedi Ruh Eşi (%100 Samimiyet)",
    description: "Bir karakterle ilişki seviyeni maksimuma çıkar veya Ebedi Bağ Yüzüğü kullan.",
    icon: "💍",
    tokensReward: 750,
    badgeReward: "💖 Ruh Eşi",
    targetCount: 1,
    getCurrentCount: (u) =>
      u.ownedItemIds?.includes("gift-soulmate-ring") ? 1 : 1,
  },
];

export function getQuestState(): DailyStreakQuestState {
  if (typeof window === "undefined") {
    return {
      streakDays: 2,
      lastClaimDate: null,
      claimedQuestIds: [],
      unlockedAchievements: [],
    };
  }
  try {
    const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    streakDays: 2,
    lastClaimDate: null,
    claimedQuestIds: [],
    unlockedAchievements: [],
  };
}

export function saveQuestState(next: DailyStreakQuestState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

interface QuestsStreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: PlatformUserRecord;
  onUserUpdated: (updated: PlatformUserRecord) => void;
}

export function QuestsStreakModal({
  open,
  onOpenChange,
  currentUser,
  onUserUpdated,
}: QuestsStreakModalProps) {
  const [questState, setQuestState] = useState<DailyStreakQuestState>(() =>
    getQuestState()
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuestState(getQuestState());
    }
  }, [open]);

  if (!open) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const canClaimDailyToday = questState.lastClaimDate !== todayIso;
  const nextStreakDay = canClaimDailyToday
    ? Math.min(7, (questState.streakDays % 7) + 1)
    : questState.streakDays;

  const handleClaimDailyStreak = () => {
    if (!canClaimDailyToday) return;
    const rewardObj =
      DAILY_STREAK_REWARDS.find((r) => r.day === nextStreakDay) ||
      DAILY_STREAK_REWARDS[0];

    const updatedUser = adjustUserTokens(
      currentUser.username,
      rewardObj.tokens,
      `🔥 ${nextStreakDay}. Gün Giriş Ödülü Alındı (+${rewardObj.tokens} 🪙)`,
      `@${currentUser.username} günlük giriş serisini ${nextStreakDay} güne çıkardı ve +${rewardObj.tokens} 🪙 kazandı!`,
      "store"
    );

    if (rewardObj.badgeReward) {
      const users = getPlatformUsers().map((u) =>
        u.username.toLowerCase() === currentUser.username.toLowerCase()
          ? { ...u, equippedBadge: rewardObj.badgeReward }
          : u
      );
      savePlatformUsers(users);
    }

    const nextState: DailyStreakQuestState = {
      ...questState,
      streakDays: nextStreakDay,
      lastClaimDate: todayIso,
    };
    setQuestState(nextState);
    saveQuestState(nextState);

    if (updatedUser) {
      onUserUpdated(updatedUser);
    }

    setNotice(
      `🎉 ${nextStreakDay}. Gün Giriş Bonusu Toplandı! Cüzdanına +${rewardObj.tokens} 🪙 Kael Token eklendi!`
    );
  };

  const handleClaimQuest = (quest: PlatformQuestItem) => {
    if (questState.claimedQuestIds.includes(quest.id)) return;

    const updatedUser = adjustUserTokens(
      currentUser.username,
      quest.tokensReward,
      `🏆 Başarım Tamamlandı: ${quest.title}`,
      `@${currentUser.username} '${quest.title}' görevini tamamlayarak +${quest.tokensReward} 🪙 ödül kazandı!`,
      "store"
    );

    if (quest.badgeReward) {
      const users = getPlatformUsers().map((u) =>
        u.username.toLowerCase() === currentUser.username.toLowerCase()
          ? { ...u, equippedBadge: quest.badgeReward }
          : u
      );
      savePlatformUsers(users);
    }

    const nextState: DailyStreakQuestState = {
      ...questState,
      claimedQuestIds: [...questState.claimedQuestIds, quest.id],
    };
    setQuestState(nextState);
    saveQuestState(nextState);

    if (updatedUser) {
      onUserUpdated(updatedUser);
    }

    setNotice(
      `🏆 '${quest.title}' ödülü toplandı! +${quest.tokensReward} 🪙${
        quest.badgeReward ? ` ve '${quest.badgeReward}' rozeti` : ""
      } hesabına eklendi!`
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          className="w-full max-w-3xl rounded-3xl border border-amber-500/40 bg-neutral-900/95 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/60 via-purple-950/50 to-neutral-900">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Flame className="size-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-tight text-white">
                    Günlük Seri (Streak) & Başarım Görevleri
                  </h2>
                  <Badge className="bg-amber-500 text-black font-black text-[10px]">
                    🔥 {questState.streakDays} Günlük Seri
                  </Badge>
                </div>
                <p className="text-xs text-neutral-300">
                  Her gün giriş yaparak bedava Kael Token (🪙) ve özel profil rozetleri kazan!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-emerald-300 hover:text-white ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </motion.div>
            )}

            {/* 7-Day Daily Streak Calendar */}
            <div className="p-5 rounded-3xl border border-amber-500/30 bg-neutral-950/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white">
                    7 Günlük Giriş Ödül Takvimi
                  </h3>
                </div>

                {canClaimDailyToday ? (
                  <Button
                    onClick={handleClaimDailyStreak}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs h-9 px-5 rounded-xl shadow-lg shadow-amber-500/25 cursor-pointer animate-pulse"
                  >
                    <Gift className="size-4 mr-1.5" />
                    Bugünün Ödülünü Topla ({nextStreakDay}. Gün)
                  </Button>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs py-1 px-3">
                    ✓ Bugünün Giriş Ödülü Alındı
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {DAILY_STREAK_REWARDS.map((item) => {
                  const isClaimed =
                    item.day < nextStreakDay ||
                    (!canClaimDailyToday && item.day <= questState.streakDays);
                  const isTodayTarget = canClaimDailyToday && item.day === nextStreakDay;

                  return (
                    <div
                      key={item.day}
                      onClick={() => {
                        if (isTodayTarget) handleClaimDailyStreak();
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-1.5 ${
                        isClaimed
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                          : isTodayTarget
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 cursor-pointer scale-105"
                          : "bg-neutral-900/70 border-white/10 text-neutral-400"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-2xl my-0.5">{item.icon}</span>
                      <span className="text-xs font-black text-amber-300">
                        +{item.tokens} 🪙
                      </span>
                      {isClaimed && (
                        <span className="text-[10px] text-emerald-400 font-bold">
                          ✓ Alındı
                        </span>
                      )}
                      {isTodayTarget && (
                        <span className="text-[10px] text-amber-300 font-extrabold">
                          Tıkla & Al!
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements & Quests List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Trophy className="size-4 text-purple-400" />
                  <span>Kael-AI Başarımları & Görevler</span>
                </h3>
                <span className="text-xs text-neutral-400">
                  Tamamlanan: {questState.claimedQuestIds.length} / {PLATFORM_QUESTS.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PLATFORM_QUESTS.map((q) => {
                  const isClaimed = questState.claimedQuestIds.includes(q.id);
                  const progress = Math.min(
                    q.targetCount,
                    q.getCurrentCount(currentUser)
                  );
                  const isReady = progress >= q.targetCount && !isClaimed;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition ${
                        isClaimed
                          ? "bg-emerald-950/15 border-emerald-500/30"
                          : isReady
                          ? "bg-purple-950/35 border-purple-500/50"
                          : "bg-neutral-950/80 border-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">
                          {q.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                            <span className="truncate">{q.title}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                            {q.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                              +{q.tokensReward} 🪙
                            </Badge>
                            {q.badgeReward && (
                              <Badge className="bg-pink-500/20 text-pink-200 border-pink-500/30 text-[10px]">
                                {q.badgeReward}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isClaimed ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] px-2.5 py-1">
                            <CheckCircle2 className="size-3.5 mr-1" /> Alındı
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleClaimQuest(q)}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs h-8 px-3 rounded-xl cursor-pointer"
                          >
                            <Coins className="size-3.5 mr-1" /> Ödülü Al
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
