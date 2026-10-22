"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Coins,
  Crown,
  ShoppingBag,
  Gift,
  Check,
  ShieldCheck,
  Zap,
  CreditCard,
  Wallet,
  Ticket,
  Heart,
  Sword,
  Rocket,
  Lock,
  X,
  ArrowRight,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  VIP_PLANS,
  TOKEN_PACKS,
  STORE_CATALOG_ITEMS,
  getPlatformUsers,
  savePlatformUsers,
  recordPlatformActivity,
  redeemPromoCode,
  type PlatformUserRecord,
  type VipPlanItem,
  type TokenPackItem,
  type StoreCatalogItem,
} from "@/lib/economy/economy-service";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import type { AuthSessionPayload } from "@/lib/social/auth-age-friendship-service";

interface StorePricingViewProps {
  session: AuthSessionPayload;
  currentUserRecord: PlatformUserRecord;
  onUserRecordUpdated: (updated: PlatformUserRecord) => void;
  onStartChatWithCharacter?: (characterId: string) => void;
}

type StoreMainTab = "vip" | "tokens" | "items" | "inventory";
type ItemCategoryFilter = "all" | "affection" | "rpg" | "cosmetic" | "boost";

export function StorePricingView({
  session,
  currentUserRecord,
  onUserRecordUpdated,
  onStartChatWithCharacter,
}: StorePricingViewProps) {
  const [activeTab, setActiveTab] = useState<StoreMainTab>("vip");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [itemFilter, setItemFilter] = useState<ItemCategoryFilter>("all");
  const [selectedGiftCharacterId, setSelectedGiftCharacterId] = useState<string>(
    FALLBACK_PERSONAS[0]?.id || "demo-yuki"
  );

  // Custom token slider calculator
  const [customTokenAmount, setCustomTokenAmount] = useState<number>(5000);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [storeNotice, setStoreNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<{
    type: "vip" | "token_pack";
    title: string;
    subtitle: string;
    priceTry: number;
    tokensGranted: number;
    vipPlan?: VipPlanItem;
    tokenPack?: TokenPackItem;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "papara" | "crypto">("card");
  const [cardHolder, setCardHolder] = useState(session.displayName || "KAEL KULLANICI");
  const [cardNumber, setCardNumber] = useState("4543 •••• •••• 8890");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    setCardHolder(session.displayName || "KAEL KULLANICI");
  }, [session.displayName]);

  const handleRedeemPromo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = redeemPromoCode(promoInput, currentUserRecord.username);
    setStoreNotice({
      type: res.success ? "success" : "error",
      text: res.message,
    });
    if (res.success) {
      setPromoInput("");
      const refreshed = getPlatformUsers().find(
        (u) => u.username.toLowerCase() === currentUserRecord.username.toLowerCase()
      );
      if (refreshed) onUserRecordUpdated(refreshed);
    }
  };

  // Complete Checkout (VIP Plan or Token Pack)
  const handleCompletePayment = () => {
    if (!checkoutTarget) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const users = getPlatformUsers();
      let updatedUser: PlatformUserRecord | null = null;

      const nextUsers = users.map((u) => {
        if (u.username.toLowerCase() === currentUserRecord.username.toLowerCase()) {
          updatedUser = {
            ...u,
            tokens: u.tokens + checkoutTarget.tokensGranted,
            tier: checkoutTarget.vipPlan ? checkoutTarget.vipPlan.id : u.tier,
            equippedBadge: checkoutTarget.vipPlan
              ? checkoutTarget.vipPlan.badge
              : u.equippedBadge,
            lastActiveAt: new Date().toISOString(),
            currentActivity: `💳 Mağazadan '${checkoutTarget.title}' Satın Aldı (+${checkoutTarget.tokensGranted.toLocaleString("tr-TR")} 🪙)`,
          };
          return updatedUser;
        }
        return u;
      });

      if (updatedUser) {
        savePlatformUsers(nextUsers);
        onUserRecordUpdated(updatedUser);

        recordPlatformActivity({
          username: (updatedUser as PlatformUserRecord).username,
          displayName: (updatedUser as PlatformUserRecord).displayName,
          avatarUrl: (updatedUser as PlatformUserRecord).avatarUrl,
          category: "store",
          actionTitle:
            checkoutTarget.type === "vip"
              ? `VIP Üyelik Yükseltildi: ${checkoutTarget.title}`
              : `Token Paketi Satın Alındı: ${checkoutTarget.title}`,
          details: `${paymentMethod.toUpperCase()} ile ${checkoutTarget.priceTry}₺ ödendi. Hesaba +${checkoutTarget.tokensGranted.toLocaleString("tr-TR")} 🪙 eklendi.`,
          tokensDelta: checkoutTarget.tokensGranted,
          priceTry: checkoutTarget.priceTry,
          severity: "success",
        });
      }

      setIsProcessingPayment(false);
      setStoreNotice({
        type: "success",
        text: `🎉 Ödeme Başarılı! '${checkoutTarget.title}' paketi aktif edildi ve +${checkoutTarget.tokensGranted.toLocaleString("tr-TR")} 🪙 cüzdanınıza yüklendi!`,
      });
      setCheckoutTarget(null);
    }, 650);
  };

  // Purchase Store Item with Tokens
  const handleBuyCatalogItem = (item: StoreCatalogItem) => {
    // Check discount for Sovereign VIP
    const effectiveCost =
      currentUserRecord.tier === "sovereign"
        ? Math.round(item.tokenCost * 0.5)
        : item.tokenCost;

    if (currentUserRecord.tokens < effectiveCost) {
      setStoreNotice({
        type: "error",
        text: `⚠️ Yetersiz Kael Token! '${item.name}' için ${effectiveCost} 🪙 gerekiyor (Mevcut: ${currentUserRecord.tokens} 🪙). Hızlı Token Paketlerinden yükleme yapabilirsin.`,
      });
      setActiveTab("tokens");
      return;
    }

    const targetChar =
      FALLBACK_PERSONAS.find((c) => c.id === selectedGiftCharacterId) || FALLBACK_PERSONAS[0];

    // Apply real side-effects in localStorage (Affection boost / RPG gold / Profile badge)
    if (item.affectionBoost && targetChar) {
      try {
        const currentAff = Number(
          localStorage.getItem(`kael_affinity_${targetChar.id}`) || "25"
        );
        const nextAff = Math.min(100, currentAff + item.affectionBoost);
        localStorage.setItem(`kael_affinity_${targetChar.id}`, String(nextAff));
      } catch {
        // ignore
      }
    }

    const users = getPlatformUsers();
    let updatedUser: PlatformUserRecord | null = null;

    const nextUsers = users.map((u) => {
      if (u.username.toLowerCase() === currentUserRecord.username.toLowerCase()) {
        const nextOwned = Array.from(new Set([...(u.ownedItemIds || []), item.id]));
        updatedUser = {
          ...u,
          tokens: Math.max(0, u.tokens - effectiveCost),
          totalSpentTokens: u.totalSpentTokens + effectiveCost,
          ownedItemIds: nextOwned,
          equippedBadge: item.profileBadge || u.equippedBadge,
          lastActiveAt: new Date().toISOString(),
          currentActivity: `🛍️ Mağazadan '${item.name}' Aldı${
            item.category === "affection" && targetChar ? ` (${targetChar.name} için)` : ""
          }`,
        };
        return updatedUser;
      }
      return u;
    });

    if (updatedUser) {
      savePlatformUsers(nextUsers);
      onUserRecordUpdated(updatedUser);

      recordPlatformActivity({
        username: (updatedUser as PlatformUserRecord).username,
        displayName: (updatedUser as PlatformUserRecord).displayName,
        avatarUrl: (updatedUser as PlatformUserRecord).avatarUrl,
        category: "store",
        actionTitle: `Mağaza Eşyası Alındı: ${item.name}`,
        details: `${effectiveCost} 🪙 harcanarak '${item.name}' satın alındı.${
          item.affectionBoost && targetChar
            ? ` ${targetChar.name} ile ilişki puanı +${item.affectionBoost} artırıldı!`
            : ""
        }`,
        characterName: item.affectionBoost ? targetChar?.name : undefined,
        tokensDelta: -effectiveCost,
        severity: "success",
      });

      setStoreNotice({
        type: "success",
        text:
          item.category === "affection" && targetChar
            ? `💝 '${item.name}' başarıyla ${targetChar.name} karakterine hediye edildi! (${item.effectLabel})`
            : `✨ '${item.name}' satın alındı ve envanterine eklendi! (${item.effectLabel})`,
      });
    }
  };

  const filteredCatalogItems = STORE_CATALOG_ITEMS.filter(
    (item) => itemFilter === "all" || item.category === itemFilter
  );

  const customTokenPriceTry = Math.max(39, Math.round((customTokenAmount / 1000) * 49));

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Wallet Hero & Promo Code Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-r from-amber-950/50 via-purple-950/50 to-neutral-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-bold px-3 py-0.5">
                💎 KAEL-AI MAĞAZA & EKONOMİ MERKEZİ
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/40 text-xs">
                Aktif Paket: {currentUserRecord.tier.toUpperCase()}
              </Badge>
              {currentUserRecord.equippedBadge && (
                <Badge className="bg-pink-500/20 text-pink-200 border-pink-500/40 text-xs">
                  {currentUserRecord.equippedBadge}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Kael Token Yükle, VIP Ol & Karakterine Hediye Gönder ✨
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Tokenlarınla 14 Neural Sesle sınırsız telefon görüşmesi yap, karakterine romantik hediyeler göndererek ilişki barını %100&apos;e çıkar veya RPG dünyasında efsanevi zarlara sahip ol.
            </p>
          </div>

          {/* Live Wallet Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <div className="p-4 rounded-2xl bg-neutral-950/85 border border-amber-500/40 shadow-xl flex items-center gap-4 min-w-[230px]">
              <div className="size-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Coins className="size-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90">
                  Cüzdan Bakiyen (@{currentUserRecord.username})
                </div>
                <div className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{currentUserRecord.tokens.toLocaleString("tr-TR")}</span>
                  <span className="text-base text-amber-400">🪙</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  Harcanan Toplam: {currentUserRecord.totalSpentTokens.toLocaleString("tr-TR")} 🪙
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Redemption Strip */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
            <Ticket className="size-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Aktif Hediye Kodları (Tıkla & Dene):</span>
            {["KAEL2026", "ANIMEVIP", "KURUCU10K"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setPromoInput(code)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 font-mono text-[11px] font-bold transition cursor-pointer"
              >
                {code}
              </button>
            ))}
          </div>

          <form onSubmit={handleRedeemPromo} className="flex items-center gap-2 w-full md:w-auto">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Promosyon Kodu (Örn: KAEL2026)"
              className="bg-neutral-950/90 border-white/15 text-xs text-white font-mono h-9 w-full md:w-56"
            />
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0 cursor-pointer"
            >
              Kodu Kullan
            </Button>
          </form>
        </div>
      </motion.div>

      {/* Notice Banner */}
      <AnimatePresence>
        {storeNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              storeNotice.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                : "bg-red-950/60 border-red-500/50 text-red-200"
            }`}
          >
            <span>{storeNotice.text}</span>
            <button
              type="button"
              onClick={() => setStoreNotice(null)}
              className="text-neutral-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Store Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("vip")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "vip"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25"
                : "bg-neutral-900/90 text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Crown className="size-4" />
            <span>VIP Üyelik & Fiyatlandırma</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tokens")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "tokens"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25"
                : "bg-neutral-900/90 text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <Coins className="size-4" />
            <span>Token Satın Al (🪙)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "items"
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/25"
                : "bg-neutral-900/90 text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>Hediye, RPG & Kozmetik Mağazası</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "inventory"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25"
                : "bg-neutral-900/90 text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            <History className="size-4" />
            <span>Envanterim ({currentUserRecord.ownedItemIds?.length || 0})</span>
          </button>
        </div>

        {activeTab === "vip" && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-white/10">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-purple-600 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Aylık Ödeme
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Yıllık Ödeme</span>
              <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px] text-emerald-200">
                %25 İndirim
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          TAB 1: VIP PLANS & PRICING TABLE
      ============================================================ */}
      {activeTab === "vip" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {VIP_PLANS.map((plan) => {
            const isCurrentTier = currentUserRecord.tier === plan.id;
            const displayPrice =
              billingCycle === "monthly" ? plan.monthlyPriceTry : plan.yearlyPriceTry;
            const tokensGranted =
              billingCycle === "monthly" ? plan.monthlyTokens : plan.monthlyTokens * 12;

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                className={`relative rounded-3xl border bg-gradient-to-b ${plan.gradient} p-6 flex flex-col justify-between shadow-2xl`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                    🔥 En Çok Tercih Edilen
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-bold">
                      {plan.badge}
                    </Badge>
                    {isCurrentTier && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                        ✓ Aktif Planın
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                    <p className="text-xs text-neutral-300 mt-1">{plan.tagline}</p>
                  </div>

                  <div className="pt-2 pb-3 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {displayPrice === 0 ? "Ücretsiz" : `${displayPrice}₺`}
                      </span>
                      {displayPrice > 0 && (
                        <span className="text-xs text-neutral-400">
                          / {billingCycle === "monthly" ? "ay" : "yıl"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Coins className="size-3.5" />
                      <span>
                        +{tokensGranted.toLocaleString("tr-TR")} 🪙 Hediye Token
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-neutral-200">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  {plan.id === "free" ? (
                    <Button
                      disabled
                      className="w-full bg-white/10 text-neutral-300 text-xs font-bold rounded-xl h-10"
                    >
                      Standart Başlangıç Paketi
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        setCheckoutTarget({
                          type: "vip",
                          title: `${plan.name} (${billingCycle === "monthly" ? "Aylık" : "Yıllık"})`,
                          subtitle: plan.tagline,
                          priceTry: displayPrice,
                          tokensGranted,
                          vipPlan: plan,
                        })
                      }
                      className={`w-full text-xs font-bold rounded-xl h-10 cursor-pointer ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/30"
                          : "bg-white hover:bg-neutral-200 text-black"
                      }`}
                    >
                      {isCurrentTier ? "Süreyi Uzat & Token Al" : "Hemen Yükselt"}
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          TAB 2: TOKEN PACKS & CUSTOM SLIDER
      ============================================================ */}
      {activeTab === "tokens" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {TOKEN_PACKS.map((pack) => {
              const totalTokens = pack.tokens + pack.bonusTokens;
              return (
                <motion.div
                  key={pack.id}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-3xl border bg-gradient-to-b ${pack.gradient} p-5 flex flex-col justify-between shadow-xl`}
                >
                  {pack.badge && (
                    <div className="flex justify-end mb-2">
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                        {pack.badge}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-3 text-center py-2">
                    <div className="text-4xl">{pack.icon}</div>
                    <h3 className="text-base font-extrabold text-white">{pack.name}</h3>
                    <div className="text-2xl font-black text-amber-300">
                      {pack.tokens.toLocaleString("tr-TR")} 🪙
                    </div>
                    {pack.bonusTokens > 0 ? (
                      <div className="text-xs font-bold text-emerald-400">
                        + {pack.bonusTokens.toLocaleString("tr-TR")} 🪙 Bedava Bonus!
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-500">Standart Yükleme</div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 space-y-2.5">
                    <div className="text-center text-xl font-black text-white">
                      {pack.priceTry}₺
                    </div>
                    <Button
                      onClick={() =>
                        setCheckoutTarget({
                          type: "token_pack",
                          title: pack.name,
                          subtitle: `Toplam ${totalTokens.toLocaleString("tr-TR")} Kael Token`,
                          priceTry: pack.priceTry,
                          tokensGranted: totalTokens,
                          tokenPack: pack,
                        })
                      }
                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl h-9 cursor-pointer"
                    >
                      Satın Al ({pack.priceTry}₺)
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Custom Token Slider Calculator */}
          <div className="rounded-3xl border border-purple-500/30 bg-neutral-900/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 flex-1 w-full">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Zap className="size-4 text-amber-400" />
                  Özel Miktar Kael Token Hesaplayıcı
                </span>
                <span className="text-base font-black text-amber-300">
                  {customTokenAmount.toLocaleString("tr-TR")} 🪙
                </span>
              </div>
              <input
                type="range"
                min={1000}
                max={200000}
                step={1000}
                value={customTokenAmount}
                onChange={(e) => setCustomTokenAmount(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>1.000 🪙</span>
                <span>50.000 🪙</span>
                <span>100.000 🪙</span>
                <span>200.000 🪙</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <div className="text-[11px] text-neutral-400">Hesaplanan Tutar</div>
                <div className="text-2xl font-black text-white">{customTokenPriceTry}₺</div>
              </div>
              <Button
                onClick={() =>
                  setCheckoutTarget({
                    type: "token_pack",
                    title: `Özel Token Paketi (${customTokenAmount.toLocaleString("tr-TR")} 🪙)`,
                    subtitle: "Özel belirlenen Kael Token yüklemesi",
                    priceTry: customTokenPriceTry,
                    tokensGranted: customTokenAmount,
                  })
                }
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs px-6 h-11 rounded-2xl cursor-pointer"
              >
                Hemen Yükle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: STORE CATALOG (GIFTS, RPG BOOSTS, COSMETICS)
      ============================================================ */}
      {activeTab === "items" && (
        <div className="space-y-6">
          {/* Category Filter + Target Character Selector for Gifts */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "🌟 Tüm Eşyalar" },
                { id: "affection", label: "🌹 Karakter Aşk Hediyeleri" },
                { id: "rpg", label: "⚔️ RPG & Zar Güçlendirmeleri" },
                { id: "cosmetic", label: "🌸 Profil Rozet & Auraları" },
                { id: "boost", label: "🚀 Vitrin Boost" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setItemFilter(cat.id as ItemCategoryFilter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    itemFilter === cat.id
                      ? "bg-pink-600 text-white shadow"
                      : "bg-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Heart className="size-4 text-pink-400 shrink-0" />
              <span className="text-xs text-neutral-300 font-semibold whitespace-nowrap">
                Hediye Gönderilecek Karakter:
              </span>
              <select
                value={selectedGiftCharacterId}
                onChange={(e) => setSelectedGiftCharacterId(e.target.value)}
                className="bg-neutral-950 border border-pink-500/40 rounded-xl px-3 py-1.5 text-xs text-white font-semibold"
              >
                {FALLBACK_PERSONAS.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentUserRecord.tier === "sovereign" && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
              <Crown className="size-4 text-amber-400 shrink-0" />
              <span>
                <strong>👑 İmparator (Sovereign) VIP Avantajı Aktif:</strong> Tüm mağaza eşyaları ve karakter hediyeleri senin için <strong>%50 İndirimli!</strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatalogItems.map((item) => {
              const isOwned = currentUserRecord.ownedItemIds?.includes(item.id);
              const effectiveCost =
                currentUserRecord.tier === "sovereign"
                  ? Math.round(item.tokenCost * 0.5)
                  : item.tokenCost;

              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-white/10 bg-neutral-900/75 p-5 flex flex-col justify-between shadow-xl hover:border-pink-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                        {item.icon}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.badge && (
                          <Badge className="bg-pink-500/20 text-pink-200 border-pink-500/30 text-[10px]">
                            {item.badge}
                          </Badge>
                        )}
                        {isOwned && item.category === "cosmetic" && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                            ✓ Envanterde
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-purple-950/35 border border-purple-500/30 text-[11px] font-semibold text-purple-200 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple-400 shrink-0" />
                      <span>Etki: {item.effectLabel}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-base font-black text-amber-300">
                        {effectiveCost} 🪙
                      </span>
                      {currentUserRecord.tier === "sovereign" && (
                        <span className="text-[11px] text-neutral-500 line-through ml-1.5">
                          {item.tokenCost} 🪙
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBuyCatalogItem(item)}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl h-9 px-4 cursor-pointer"
                    >
                      {item.category === "affection" ? (
                        <>
                          <Gift className="size-3.5 mr-1.5" /> Hediye Gönder
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="size-3.5 mr-1.5" /> Satın Al
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: INVENTORY & EQUIPPED COSMETICS
      ============================================================ */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-neutral-900/75 space-y-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ShoppingBag className="size-5 text-emerald-400" />
              <span>Sahip Olduğun Eşyalar, Hediyeler & Kozmetikler</span>
            </h3>

            {(!currentUserRecord.ownedItemIds ||
              currentUserRecord.ownedItemIds.length === 0) ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-neutral-400">
                  Henüz mağazadan bir eşya veya kozmetik satın almadın.
                </p>
                <Button
                  onClick={() => setActiveTab("items")}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                >
                  Mağazayı Keşfet
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentUserRecord.ownedItemIds.map((itemId) => {
                  const item = STORE_CATALOG_ITEMS.find((i) => i.id === itemId);
                  if (!item) return null;
                  const isEquipped =
                    item.profileBadge &&
                    currentUserRecord.equippedBadge === item.profileBadge;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{item.icon}</div>
                        <div>
                          <div className="text-xs font-bold text-white">{item.name}</div>
                          <div className="text-[11px] text-emerald-300">
                            {item.effectLabel}
                          </div>
                        </div>
                      </div>

                      {item.profileBadge && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const users = getPlatformUsers();
                            const nextUsers = users.map((u) => {
                              if (
                                u.username.toLowerCase() ===
                                currentUserRecord.username.toLowerCase()
                              ) {
                                const updated = {
                                  ...u,
                                  equippedBadge: item.profileBadge,
                                };
                                onUserRecordUpdated(updated);
                                return updated;
                              }
                              return u;
                            });
                            savePlatformUsers(nextUsers);
                          }}
                          className={`text-[11px] h-8 rounded-xl cursor-pointer ${
                            isEquipped
                              ? "bg-emerald-600 text-white"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          {isEquipped ? "✓ Kuşanıldı" : "Rozeti Kuşan"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          INTERACTIVE CHECKOUT MODAL (KART / PAPARA / KRİPTO)
      ============================================================ */}
      <AnimatePresence>
        {checkoutTarget && (
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
              className="w-full max-w-lg rounded-3xl border border-purple-500/40 bg-neutral-900 p-6 text-white shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center">
                    <CreditCard className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">
                      Kael-AI Güvenli Ödeme & Anında Aktivasyon
                    </h3>
                    <p className="text-xs text-neutral-400">
                      256-Bit SSL Korumalı Hızlı Satın Alım
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Order Summary Box */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase">
                    Seçilen Paket
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {checkoutTarget.title}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                    +{checkoutTarget.tokensGranted.toLocaleString("tr-TR")} 🪙 Kael Token Anında Yüklenecek
                  </div>
                </div>
                <div className="text-2xl font-black text-white">
                  {checkoutTarget.priceTry}₺
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-neutral-950 border border-white/10">
                {[
                  { id: "card", label: "💳 Banka / Kredi Kartı" },
                  { id: "papara", label: "⚡ Papara / Hızlı Öde" },
                  { id: "crypto", label: "🪙 USDT / Kripto" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as "card" | "papara" | "crypto")}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-purple-600 text-white"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Kart Üzerindeki İsim
                    </label>
                    <Input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="bg-neutral-950 border-white/15 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-neutral-400 block mb-1">
                        Kart Numarası (Demo Hazır)
                      </label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="bg-neutral-950 border-white/15 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">
                        SKT / CVV
                      </label>
                      <Input
                        defaultValue="08/29 • 777"
                        className="bg-neutral-950 border-white/15 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "papara" && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                  <div className="font-bold">⚡ Papara Tek Tıkla Anında Onay</div>
                  <p className="text-neutral-300">
                    Onay butonuna bastığınızda Papara simülasyonu üzerinden bakiyeniz anında hesabınıza tanımlanır.
                  </p>
                </div>
              )}

              {paymentMethod === "crypto" && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
                  <div className="font-bold">🪙 TRC-20 / Solana Hızlı Transfer</div>
                  <p className="text-neutral-300 font-mono text-[11px]">
                    Cüzdan: TKaelAi99x7824198249182491284
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <ShieldCheck className="size-4" />
                  <span>Anında Teslimat Garantisi</span>
                </div>

                <Button
                  onClick={handleCompletePayment}
                  disabled={isProcessingPayment}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs px-6 h-10 rounded-xl cursor-pointer"
                >
                  {isProcessingPayment
                    ? "Ödeme Onaylanıyor..."
                    : `Ödemeyi Tamamla (${checkoutTarget.priceTry}₺)`}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
