"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  LogIn,
  Ghost,
  Calendar,
  Wand2,
  Plus,
  Trash2,
  Upload,
  X,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  modalBackdropVariants,
  modalPanelVariants,
  pageTransitionVariants,
} from "@/lib/animations";
import {
  calculateExactAge,
  createInitialGuestSession,
  upgradeGuestToRegisteredAccount,
  type AuthSessionPayload,
  type UserPersonaItem,
} from "@/lib/social/auth-age-friendship-service";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: AuthSessionPayload;
  onSessionUpdated: (nextSession: AuthSessionPayload) => void;
  personas: UserPersonaItem[];
  onPersonasUpdated: (nextPersonas: UserPersonaItem[]) => void;
}

interface StoredAccountRecord {
  username: string;
  password: string;
  sessionData: AuthSessionPayload;
}

const PERSONA_PRESETS = [
  {
    name: "Kael Gezgini",
    backstory:
      "Gece sokaklarında sırları araştıran, soğukkanlı, zeki ve sadık bir maceracı. Deri ceket giyer ve keskin gözlem yeteneğine sahiptir.",
    avatarUrl: "/avatars/kaito.jpg",
  },
  {
    name: "Emir (Dedektif Ortağı)",
    backstory:
      "Komiser Boz'un emniyetteki en güvendiği genç kriminal uzmanı. Analitik düşünen, esprili ve cesur.",
    avatarUrl: "/avatars/komiser-boz.jpg",
  },
  {
    name: "Elif (Akademi Öğrencisi)",
    backstory:
      "Üniversiteye hazırlanan, matematik ve fantastik edebiyat meraklısı, enerjik ve meraklı öğrenci.",
    avatarUrl: "/avatars/yuki.jpg",
  },
  {
    name: "Gümüş Avcı",
    backstory:
      "Kadim ormanlarda ve gotik şatolarda efsanevi yaratıkların izini süren gizemli büyü kılıcı ustası.",
    avatarUrl: "/avatars/luna.jpg",
  },
];

export function OnboardingModal({
  open,
  onOpenChange,
  session,
  onSessionUpdated,
  personas,
  onPersonasUpdated,
}: OnboardingModalProps) {
  const [activeMainTab, setActiveMainTab] = useState<"auth" | "persona">("auth");
  const [authMode, setAuthMode] = useState<"login" | "register" | "guest">("login");

  // Register Form Fields
  const [email, setEmail] = useState(session.email || "");
  const [username, setUsername] = useState(session.isGuest ? "" : session.username || "");
  const [displayName, setDisplayName] = useState(session.isGuest ? "" : session.displayName || "");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState(session.birthDate || "2004-05-15");

  // Login-Only Form Fields (Sadece Kullanıcı Adı ve Şifre!)
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<StoredAccountRecord[]>([]);

  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Persona Wizard Fields
  const [personaName, setPersonaName] = useState("");
  const [personaBackstory, setPersonaBackstory] = useState("");
  const [personaAvatar, setPersonaAvatar] = useState("/avatars/kaito.jpg");

  useEffect(() => {
    const defaultP = personas.find((p) => p.isDefault) || personas[0];
    if (defaultP) {
      setPersonaName(defaultP.name);
      setPersonaBackstory(defaultP.backstory);
      setPersonaAvatar(defaultP.avatarUrl);
    }

    try {
      const kaelFounderAccount: StoredAccountRecord = {
        username: "kael",
        password: "123",
        sessionData: {
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
        },
      };

      const rawAcc = localStorage.getItem("kael_registered_accounts");
      if (rawAcc) {
        const parsed: StoredAccountRecord[] = JSON.parse(rawAcc);
        if (Array.isArray(parsed)) {
          const hasKael = parsed.some((a) => a.username.toLowerCase() === "kael");
          const merged = hasKael ? parsed : [kaelFounderAccount, ...parsed];
          setSavedAccounts(merged);
          if (merged.length > 0 && !loginUsername) {
            setLoginUsername(merged[0].username);
          }
        }
      } else {
        setSavedAccounts([kaelFounderAccount]);
        localStorage.setItem(
          "kael_registered_accounts",
          JSON.stringify([kaelFounderAccount])
        );
      }
    } catch {
      // ignore
    }
  }, [personas, open, loginUsername]);

  if (!open) return null;

  const computedAge = calculateExactAge(birthDate);
  const isUnder18 = computedAge < 18;

  // 1. SADECE KULLANICI ADI VE ŞİFRE İLE GİRİŞ YAP (Login)
  const handleLoginWithUsernameAndPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = loginUsername.replace(/^@/, "").trim().toLowerCase();
    if (!cleanUser || !loginPassword.trim()) {
      setAuthNotice("⚠️ Lütfen kullanıcı adınızı ve şifrenizi girin.");
      return;
    }

    const found = savedAccounts.find(
      (acc) => acc.username.toLowerCase() === cleanUser
    );

    if (found) {
      if (found.password !== loginPassword) {
        setAuthNotice("❌ Şifre hatalı! Lütfen kayıt olurken belirlediğiniz şifreyi girin.");
        return;
      }

      onSessionUpdated(found.sessionData);
      localStorage.setItem("kael_auth_session", JSON.stringify(found.sessionData));
      localStorage.setItem(
        "kael_user_profile",
        JSON.stringify({
          display_name: found.sessionData.displayName,
          bio: found.sessionData.bio,
          avatar_url: found.sessionData.avatarUrl,
          persona_notes: personas.find((p) => p.isDefault)?.backstory || "",
        })
      );
      setAuthNotice(`✅ Hoş geldin @${found.username}! Başarıyla giriş yapıldı.`);
      return;
    }

    // Eğer daha önce kayıtlı değilse hızlı giriş oluşturup kaydet
    const quickSession = upgradeGuestToRegisteredAccount(session, {
      email: `${cleanUser}@kael.ai`,
      username: cleanUser,
      displayName: cleanUser,
      birthDate: session.birthDate || "2002-01-01",
    });

    const newRecord: StoredAccountRecord = {
      username: cleanUser,
      password: loginPassword,
      sessionData: quickSession,
    };
    const nextAccounts = [
      newRecord,
      ...savedAccounts.filter((a) => a.username.toLowerCase() !== cleanUser),
    ];
    setSavedAccounts(nextAccounts);
    localStorage.setItem("kael_registered_accounts", JSON.stringify(nextAccounts));
    onSessionUpdated(quickSession);
    localStorage.setItem("kael_auth_session", JSON.stringify(quickSession));

    setAuthNotice(`✅ @${cleanUser} olarak giriş yapıldı ve oturumunuz kaydedildi!`);
  };

  // 2. KAYIT OL VEYA MİSAFİR HESABI KALICI YAP (Register)
  const handleRegisterOrUpgrade = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.replace(/^@/, "").trim().toLowerCase();
    if (!cleanUser || !password.trim() || !birthDate) {
      setAuthNotice("⚠️ Lütfen Kullanıcı Adı, Şifre ve Doğum Tarihi alanlarını doldurun.");
      return;
    }

    const upgraded = upgradeGuestToRegisteredAccount(session, {
      email: email || `${cleanUser}@kael.ai`,
      username: cleanUser,
      displayName: displayName.trim() || cleanUser,
      birthDate,
    });

    // Kayıtlı hesaplar listesine kaydet (Böylece bir dahaki sefere SADECE kullanıcı adı ve şifre ile giriş yapabilir!)
    const newRecord: StoredAccountRecord = {
      username: cleanUser,
      password,
      sessionData: upgraded,
    };
    const nextAccounts = [
      newRecord,
      ...savedAccounts.filter((a) => a.username.toLowerCase() !== cleanUser),
    ];
    setSavedAccounts(nextAccounts);
    localStorage.setItem("kael_registered_accounts", JSON.stringify(nextAccounts));

    onSessionUpdated(upgraded);
    localStorage.setItem("kael_auth_session", JSON.stringify(upgraded));

    localStorage.setItem(
      "kael_user_profile",
      JSON.stringify({
        display_name: upgraded.displayName,
        bio: upgraded.bio,
        avatar_url: upgraded.avatarUrl,
        persona_notes: personas.find((p) => p.isDefault)?.backstory || "",
      })
    );

    setLoginUsername(cleanUser);
    setAuthNotice(
      upgraded.isAdult
        ? `✅ Kayıt tamamlandı (@${cleanUser})! Artık her zaman sadece kullanıcı adın ve şifrenle giriş yapabilirsin.`
        : `🛡️ Kayıt tamamlandı (@${cleanUser} — 18 Yaş Altı SFW Korumalı Mod). Artık sadece kullanıcı adın ve şifrenle giriş yapabilirsin.`
    );
  };

  // 3. Misafir Olarak Devam Et (Continue as Guest)
  const handleContinueAsGuest = () => {
    const guestSession = createInitialGuestSession();
    onSessionUpdated(guestSession);
    localStorage.setItem("kael_auth_session", JSON.stringify(guestSession));
    setAuthNotice(
      "👻 Misafir oturumu aktif! Varsayılan olarak 18 yaş altı güvenli (SFW) moddasınız."
    );
  };

  // 4. Yeni Persona Kaydet veya Güncelle
  const handleSavePersona = () => {
    if (!personaName.trim()) return;
    const newPersona: UserPersonaItem = {
      id: `persona-${Date.now()}`,
      name: personaName.trim(),
      backstory: personaBackstory.trim(),
      avatarUrl: personaAvatar,
      isDefault: true,
    };

    const updatedList = [
      newPersona,
      ...personas.map((p) => ({ ...p, isDefault: false })),
    ];
    onPersonasUpdated(updatedList);
    localStorage.setItem("kael_user_personas", JSON.stringify(updatedList));

    localStorage.setItem(
      "kael_user_profile",
      JSON.stringify({
        display_name: newPersona.name,
        bio: session.bio,
        avatar_url: newPersona.avatarUrl,
        persona_notes: newPersona.backstory,
      })
    );

    setAuthNotice(
      `✨ "${newPersona.name}" personası aktif edildi! Tüm AI botlar artık sana bu kimlikle hitap edecek.`
    );
  };

  const handleSelectDefaultPersona = (id: string) => {
    const updated = personas.map((p) => ({
      ...p,
      isDefault: p.id === id,
    }));
    const active = updated.find((p) => p.id === id);
    onPersonasUpdated(updated);
    localStorage.setItem("kael_user_personas", JSON.stringify(updated));
    if (active) {
      setPersonaName(active.name);
      setPersonaBackstory(active.backstory);
      setPersonaAvatar(active.avatarUrl);
      localStorage.setItem(
        "kael_user_profile",
        JSON.stringify({
          display_name: active.name,
          bio: session.bio,
          avatar_url: active.avatarUrl,
          persona_notes: active.backstory,
        })
      );
    }
  };

  const handleDeletePersona = (id: string) => {
    if (personas.length <= 1) return;
    const filtered = personas.filter((p) => p.id !== id);
    if (!filtered.some((p) => p.isDefault) && filtered[0]) {
      filtered[0].isDefault = true;
    }
    onPersonasUpdated(filtered);
    localStorage.setItem("kael_user_personas", JSON.stringify(filtered));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPersonaAvatar(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          variants={modalPanelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full max-w-2xl rounded-3xl border border-white/15 bg-neutral-900/95 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Bar */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-950/60 via-neutral-900 to-pink-950/40">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Sparkles className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <span>Giriş Yap, Kayıt Ol & Persona Sihirbazı</span>
                  {session.isGuest ? (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                      👻 Misafir (SFW)
                    </Badge>
                  ) : session.isAdult ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                      ✅ @{session.username} (18+ Üye)
                    </Badge>
                  ) : (
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px]">
                      🛡️ @{session.username} (SFW Korumalı)
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-neutral-400">
                  Kayıtlı hesabına sadece kullanıcı adı ve şifre ile giriş yap veya rol personanı seç
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

          {/* Sliding Tab Header */}
          <div className="flex border-b border-white/10 bg-neutral-950/60 px-6 pt-3 gap-6">
            {[
              {
                id: "auth",
                label: "🔐 Giriş Yap / Kayıt Ol",
              },
              {
                id: "persona",
                label: "🎭 Persona Sihirbazı ({{user}} Kimliğin)",
              },
            ].map((tab) => {
              const isActive = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveMainTab(tab.id as "auth" | "persona");
                    setAuthNotice(null);
                  }}
                  className={`relative pb-3 text-xs font-bold transition-colors cursor-pointer ${
                    isActive ? "text-purple-300" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="onboardingActiveTabLine"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {authNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200 flex items-center justify-between"
              >
                <span>{authNotice}</span>
                <button
                  type="button"
                  onClick={() => setAuthNotice(null)}
                  className="text-purple-300 hover:text-white ml-2"
                >
                  ✕
                </button>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {activeMainTab === "auth" ? (
                <motion.div
                  key="auth-tab"
                  variants={pageTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* 3-Way Auth Selector Pills: Giriş Yap First! */}
                  <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-neutral-950 border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthNotice(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        authMode === "login"
                          ? "bg-purple-600 text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <LogIn className="size-3.5" />
                      <span>Giriş Yap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthNotice(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        authMode === "register"
                          ? "bg-purple-600 text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <UserPlus className="size-3.5" />
                      <span>Kayıt Ol</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("guest");
                        setAuthNotice(null);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        authMode === "guest"
                          ? "bg-amber-600 text-white shadow"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Ghost className="size-3.5" />
                      <span>Misafir Modu</span>
                    </button>
                  </div>

                  {/* MODE 1: LOGIN (SADECE KULLANICI ADI VE ŞİFRE!) */}
                  {authMode === "login" && (
                    <form
                      onSubmit={handleLoginWithUsernameAndPassword}
                      className="p-5 rounded-2xl border border-purple-500/30 bg-neutral-950/80 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <KeyRound className="size-4 text-purple-400" />
                          <span>Kullanıcı Adı ve Şifre ile Hızlı Giriş</span>
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          Kayıtlı hesabına anında bağlan
                        </span>
                      </div>

                      {savedAccounts.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-purple-300 font-semibold">
                            Bu Cihazda Kayıtlı Hesapların (Tıkla & Doldur):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {savedAccounts.map((acc) => (
                              <button
                                key={acc.username}
                                type="button"
                                onClick={() => {
                                  setLoginUsername(acc.username);
                                  setLoginPassword(acc.password);
                                }}
                                className="px-3 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-xs text-purple-200 font-semibold transition cursor-pointer"
                              >
                                @{acc.username} ({acc.sessionData.displayName})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Kullanıcı Adı (<code>@kullanici_adi</code>):
                          </label>
                          <Input
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder="Örn: kael_kullanici"
                            className="bg-neutral-900 border-white/15 text-xs text-white h-10"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Şifre:
                          </label>
                          <Input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-neutral-900 border-white/15 text-xs text-white h-10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setAuthMode("register")}
                          className="text-xs text-purple-300 hover:underline cursor-pointer"
                        >
                          Hesabın yok mu? Yeni Kayıt Ol →
                        </button>

                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl px-6 h-10 cursor-pointer"
                        >
                          <LogIn className="size-4 mr-1.5" />
                          Giriş Yap
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* MODE 2: REGISTER (YENİ KAYIT & YAŞ DOĞRULAMA) */}
                  {authMode === "register" && (
                    <form onSubmit={handleRegisterOrUpgrade} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Kullanıcı Adı (<code>@kullanici_adi</code>) *:
                          </label>
                          <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="kael_kullanici"
                            className="bg-neutral-950 border-white/15 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Şifre *:
                          </label>
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-neutral-950 border-white/15 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            Görünen Ad:
                          </label>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Örn: Kaan Yıldız"
                            className="bg-neutral-950 border-white/15 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-neutral-300 block mb-1">
                            E-Posta (İsteğe Bağlı):
                          </label>
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@kael.ai"
                            className="bg-neutral-950 border-white/15 text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Mandatory Birth Date & Real-Time Age-Gate Indicator */}
                      <div className="p-3.5 rounded-2xl border border-white/10 bg-neutral-950/80 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Calendar className="size-4 text-purple-400" />
                            <span>Doğum Tarihi (Zorunlu Yaş Doğrulama):</span>
                          </label>
                          <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="bg-neutral-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                            isUnder18
                              ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                              : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                          }`}
                        >
                          {isUnder18 ? (
                            <>
                              <ShieldAlert className="size-4 text-amber-400 shrink-0" />
                              <span>
                                Hesaplanan Yaş: <strong>{computedAge}</strong> (18 Yaş Altı). Güvenli SFW Modu zorunlu olarak kilitlenir.
                              </span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                              <span>
                                Hesaplanan Yaş: <strong>{computedAge}</strong> (18+ Yetişkin). Profil ayarlarından NSFW filtresini yönetebilirsiniz.
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl px-6 cursor-pointer"
                        >
                          <UserCheck className="size-4 mr-1.5" />
                          Kayıt Ol & Hesabı Kaydet
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* MODE 3: GUEST */}
                  {authMode === "guest" && (
                    <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                        <Ghost className="size-5" />
                        <span>Misafir Olarak Kullan (Continue as Guest)</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Kayıt olmadan tek tıkla geçici bir <code>guest_uuid</code> ile platformu deneyimleyebilirsiniz.
                        Misafir kullanıcılar varsayılan olarak <strong>18 yaş altı güvenli (SFW)</strong> modunda başlar.
                      </p>
                      <Button
                        type="button"
                        onClick={handleContinueAsGuest}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        👻 Misafir Oturumuyla Devam Et
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="persona-tab"
                  variants={pageTransitionVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-5"
                >
                  {/* Existing Personas Switcher */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Kayıtlı Personaların (Aktif Rol Kimliğini Seç):
                      </label>
                      <span className="text-[11px] text-purple-300">
                        Sohbet sırasında istediğin an değiştirebilirsin
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {personas.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectDefaultPersona(p.id)}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            p.isDefault
                              ? "bg-purple-950/40 border-purple-500/60 shadow-md"
                              : "bg-neutral-950/60 border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.avatarUrl || "/avatars/kaito.jpg"}
                              alt={p.name}
                              className="size-10 rounded-xl object-cover border border-purple-500/40 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                <span>{p.name}</span>
                                {p.isDefault && (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0">
                                    Aktif
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {p.backstory}
                              </p>
                            </div>
                          </div>
                          {personas.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePersona(p.id);
                              }}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400 font-semibold">
                      ✨ Hazır Persona Şablonları (Tek Tıkla Doldur):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PERSONA_PRESETS.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setPersonaName(preset.name);
                            setPersonaBackstory(preset.backstory);
                            setPersonaAvatar(preset.avatarUrl);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-purple-600/25 border border-white/10 hover:border-purple-500/40 text-[11px] text-neutral-300 hover:text-purple-200 transition cursor-pointer"
                        >
                          <Wand2 className="size-3 inline mr-1 text-purple-400" />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 1, 2, 3 Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
                    {/* Avatar Picker */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/10 bg-neutral-950/60 space-y-2.5">
                      <img
                        src={personaAvatar}
                        alt="Persona Avatar"
                        className="size-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg"
                      />
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-purple-200 flex items-center gap-1.5 transition">
                        <Upload className="size-3" />
                        <span>Fotoğraf Yükle</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Name & Backstory */}
                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-neutral-200 block mb-1">
                          1. Hitap İsmi (`{"{{user}}"}` - Botlar Sana Nasıl Seslensin?):
                        </label>
                        <Input
                          value={personaName}
                          onChange={(e) => setPersonaName(e.target.value)}
                          placeholder="Örn: Kaan, Gece Yolcusu, Dedektif Emir..."
                          className="bg-neutral-950 border-white/15 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-neutral-200 block mb-1">
                          2. Karakter Hikayesi & Özellikleri (Persona Lore):
                        </label>
                        <Textarea
                          rows={3}
                          value={personaBackstory}
                          onChange={(e) => setPersonaBackstory(e.target.value)}
                          placeholder="Botların senin hakkında bilmesini istediğin dış görünüşün, mesleğin, kişiliğin veya geçmiş hikayen..."
                          className="bg-neutral-950 border-white/15 text-xs text-white resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleSavePersona}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl px-5 cursor-pointer"
                    >
                      <Plus className="size-3.5 mr-1.5" />
                      Personayı Kaydet & Aktif Yap
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
