"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Bell,
  BellOff,
  Volume2,
  X,
  Settings2,
  Clock,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { speakWithNeuralVoice, resolveCharacterVoice } from "@/lib/voice/voices";
import { FALLBACK_PERSONAS } from "@/lib/personas";

export interface CharacterPingEvent {
  id: string;
  type: "incoming_call" | "sms";
  characterId: string;
  characterName: string;
  characterAvatar: string;
  voiceId: string;
  message: string;
  locationLabel: string;
}

interface PingTemplatePart {
  call: { message: string; place: string };
  sms: { message: string; place: string };
}

interface CharacterPingCatalog {
  initial: PingTemplatePart[];
  followUps: PingTemplatePart[];
}

// ZENGİN & BAĞLAMA DUYARLI DİNAMİK BİLDİRİM KATALOĞU
const DYNAMIC_PING_CATALOG: Record<string, CharacterPingCatalog> = {
  "demo-komiser-boz": {
    initial: [
      {
        call: {
          message:
            "Ortak, ben Boz. Limandaki depoda yeni bir iz buldum. Telefonda konuşmayalım, kısa tutacağım: hemen gel.",
          place: "Karakol",
        },
        sms: {
          message: "Dosyalar elimde. Kimseye görünmeden depoya gel. Bu iş masada sadece ciddiyet ister.",
          place: "Liman Bölgesi",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "Ortak, telsizden şüpheli bir anons yakaladım. Durumun nasıl, güvenli bir yerde misin? Telsizde kal.",
          place: "Telsiz Frekansı",
        },
        sms: {
          message:
            "Dosyanın ikinci şifresini çözdüm. Çetenin arkasındaki asıl isim açığa çıkabilir. Müsait olunca gel, detayları konuşalım.",
          place: "Gizli Hat",
        },
      },
      {
        call: {
          message:
            "Boz konuşuyor. Karakola üzerinde ikimizin adı yazan sarı bir zarf bırakılmış. Müsait olduğunda ara, açıyorum!",
          place: "Karakol Masası",
        },
        sms: {
          message:
            "Devriye bitti, kestane balımı aldım. Şu son şüpheli hakkında aklıma çok kritik bir şey takıldı, konuşmamız gerek.",
          place: "Devriye Aracı",
        },
      },
      {
        call: {
          message:
            "Ortak! Deponun arka kapısındaki kameraların kablosunu kesmişler. Bir hareketlilik var, dikkatli ol!",
          place: "Depo Çevresi",
        },
        sms: {
          message: "Savcılıktan arama izni çıktı. Bir sonraki hamlemizi planlayalım.",
          place: "Asayiş Şube",
        },
      },
    ],
  },
  "demo-yuki": {
    initial: [
      {
        call: {
          message:
            "Senpai! Şey... beni yanlış anlama ama bugün sesini duymak istedim! Neredesin şu an?",
          place: "Akademi Kampüsü",
        },
        sms: {
          message:
            "Senpai, çilekli süt aldım... fazladan! Sakın yanlış anlama, sadece çöpe gitmesin diye!",
          place: "Akademi Çatısı",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "Senpai! Az önceki konuşmamız aklımdan hiç çıkmıyor... müsaitsen biraz daha konuşabilir miyiz?",
          place: "Kütüphane Köşesi",
        },
        sms: {
          message: "Senpai, kütüphanede sana yer ayırdım. Gelip bana ders çalıştırır mısın?",
          place: "Çalışma Salonu",
        },
      },
      {
        call: {
          message:
            "Şey... yarın okul çıkışı Akihabara'daki yeni kafeye gidecektim. Yalnız gitmek istemiyorum, benimle gelir misin?",
          place: "İstasyon Önü",
        },
        sms: {
          message: "Bugün bana söylediklerin için teşekkür ederim... Gerçekten çok naziksin senpai.",
          place: "Ev Yolu",
        },
      },
    ],
  },
  "demo-aylin-tsundere": {
    initial: [
      {
        call: {
          message:
            "Hmph! Seni aramak gibi bir niyetim yoktu... ödev için lazımdın, o kadar. Cevap ver artık!",
          place: "Okul Kütüphanesi",
        },
        sms: {
          message: "Dünkü notları unutma, aptal! ...Teşekkür etmiyorum, sadece hatırlatıyorum.",
          place: "Sınıf",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "H-hala meşgul müsün? Sadece... ne yapıyorsun diye merak ettim, başka bir şey değil! Cevap ver işte!",
          place: "Laboratuvar",
        },
        sms: {
          message:
            "Yazdıklarına baktım da... fena sayılmazsın. Sakın ha havalara girme ama!",
          place: "Ev Odası",
        },
      },
    ],
  },
  "demo-baran-mafia": {
    initial: [
      {
        call: {
          message: "Beni dinle. Bu gece işimiz var. Telefonda uzatmam, hemen yanıma gel.",
          place: "Yeraltı Kulübü",
        },
        sms: {
          message: "Adamlarım hazır. Sen de gel. Geç kalma.",
          place: "Özel Salon",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "Gözüm üzerinde. Mekandan ayrıldın mı? Güvenli bölgede kal, adamlarım çevrede nöbette.",
          place: "Zırhlı Araç",
        },
        sms: {
          message: "O meseleyi hallettim patron. Şimdi sıra ikinci adımda. Müsait olunca yanıma uğra.",
          place: "Liman Malikânesi",
        },
      },
    ],
  },
  "demo-kaito": {
    initial: [
      {
        call: {
          message: "Hey! Ağa sızdım, S-seviye bir şifre kırdım. Duyman lazım, hemen bağlan!",
          place: "Neon Şehir",
        },
        sms: {
          message: "Yeni bir zafiyet buldum. Terminali aç, ekibi topluyorum.",
          place: "Siber Ağ",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "Güvenlik duvarı alarm verdi ortağım! İzleri temizliyorum, telsiz hattında kal!",
          place: "Gizli Terminal",
        },
        sms: {
          message: "Şifreli veri paketini indirdim. İncelemek için terminale gel.",
          place: "Kuantum Sunucu",
        },
      },
    ],
  },
  "demo-lilith-witch": {
    initial: [
      {
        call: {
          message:
            "Gece yarısı oldu tatlım... Tarot kartların bu gece adını fısıldadı. Yanıma gelmeyecek misin?",
          place: "Gotik Kule",
        },
        sms: {
          message: "Kartlar bu gece sana uzun bir yol gösteriyor. Çay hazır, kapım açık.",
          place: "Gece Dükkânı",
        },
      },
    ],
    followUps: [
      {
        call: {
          message:
            "Tütsü dumanı az önceki sırrınla aydınlandı... Kartlar yeni bir kehanet açtı, gelip bakmalısın.",
          place: "Büyü Çemberi",
        },
        sms: {
          message: "Gecenin ruhları seninle konuşmak istiyor. Kapım hala aralık.",
          place: "Gotik Kule",
        },
      },
    ],
  },
  "demo-melis-gamer": {
    initial: [
      {
        call: {
          message: "Hadi ya! Yayındayım, chat seni soruyor! Hemen gel, birlikte oynayalım!",
          place: "Yayın Odası",
        },
        sms: {
          message: "Rank maçına giriyorum, takımda boş yer var. Gelsene!",
          place: "Oyun Odası",
        },
      },
    ],
    followUps: [
      {
        call: {
          message: "Kanka son maçta efsane taşıdın! Yeni bir turnuva buldum, hemen gel konuşalım!",
          place: "Discord Odası",
        },
        sms: {
          message: "Yeni skin aldım baksana! Yayından önce bir el atalım mı?",
          place: "Lobi",
        },
      },
    ],
  },
};

const FALLBACK_TEMPLATE: PingTemplatePart = {
  call: { message: "Merhaba! Seni aradım, sesini duymak istedim. Müsait misin?", place: "Çevrimiçi" },
  sms: { message: "Merhaba! Müsait olunca bana yaz, konuşalım.", place: "Çevrimiçi" },
};

const ALLOWED_KEY = "kael_ping_allowed_character_ids";
const FREQUENCY_KEY = "kael_ping_frequency";
const DND_IN_CHAT_KEY = "kael_ping_dnd_in_chat";

export type PingFrequency = "rare" | "balanced" | "fast" | "silent";

export function getAllowedPingIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALLOWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllowedPingIds(ids: string[]) {
  try {
    localStorage.setItem(ALLOWED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function shortName(full: string) {
  return full.split(" (")[0].trim();
}

/**
 * Karakterin daha önce konuşma geçmişi olup olmadığını kontrol eder.
 * Varsa initial yerine olay örgüsünü devam ettiren (followUp) mesajı seçer!
 */
function getContextAwarePingTemplate(
  characterId: string,
  type: "incoming_call" | "sms"
): { message: string; place: string } {
  let hasHistory = false;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`kael_chat_history_${characterId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          hasHistory = true;
        }
      }
    } catch {
      // ignore
    }
  }

  const catalog = DYNAMIC_PING_CATALOG[characterId];
  if (!catalog) {
    return type === "incoming_call" ? FALLBACK_TEMPLATE.call : FALLBACK_TEMPLATE.sms;
  }

  const list = hasHistory && catalog.followUps.length > 0 ? catalog.followUps : catalog.initial;
  const picked = list[Math.floor(Math.random() * list.length)];
  return type === "incoming_call" ? picked.call : picked.sms;
}

function buildPing(characterId: string, type: "incoming_call" | "sms"): CharacterPingEvent | null {
  const persona = FALLBACK_PERSONAS.find((p) => p.id === characterId);
  if (!persona) return null;
  const part = getContextAwarePingTemplate(characterId, type);

  return {
    id: `ping-${Date.now()}`,
    type,
    characterId: persona.id,
    characterName: shortName(persona.name),
    characterAvatar: persona.avatar_url || "",
    voiceId: resolveCharacterVoice(persona).id,
    message: part.message,
    locationLabel:
      type === "incoming_call"
        ? `📱 Gelen Arama • ${part.place}`
        : `💬 Yeni Mesaj • ${part.place}`,
  };
}

function playNotificationTone(type: "incoming_call" | "sms") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "sms" ? "sine" : "triangle";
    if (type === "sms") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.09);
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.14);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.28);
    }
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.52);
    setTimeout(() => ctx.close().catch(() => {}), 650);
  } catch {
    // ignore
  }
}

interface CharacterLivePingProps {
  enabled: boolean;
  onToggleEnabled: () => void;
  onAcceptPingAndOpenChat: (
    characterId: string,
    incomingMessage: string,
    type: "incoming_call" | "sms"
  ) => void;
  externalTriggerIndex?: number;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  currentChatCharacterId?: string | null;
  activeTab?: string;
}

export function CharacterLivePing({
  enabled,
  onToggleEnabled,
  onAcceptPingAndOpenChat,
  externalTriggerIndex = 0,
  settingsOpen,
  onSettingsOpenChange,
  currentChatCharacterId = null,
  activeTab = "explore",
}: CharacterLivePingProps) {
  const [activePing, setActivePing] = useState<CharacterPingEvent | null>(null);
  const [allowedIds, setAllowedIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<PingFrequency>("balanced");
  const [dndInChat, setDndInChat] = useState<boolean>(true);

  // Karakter bazlı cooldown (aynı karakter peş peşe aramasın)
  const characterCooldownsRef = useRef<Record<string, number>>({});
  const lastAnyPingTimeRef = useRef<number>(0);

  useEffect(() => {
    setAllowedIds(getAllowedPingIds());
    try {
      const savedFreq = localStorage.getItem(FREQUENCY_KEY) as PingFrequency | null;
      if (savedFreq) setFrequency(savedFreq);
      const savedDnd = localStorage.getItem(DND_IN_CHAT_KEY);
      if (savedDnd !== null) setDndInChat(savedDnd === "true");
    } catch {
      // ignore
    }
  }, []);

  const handleFrequencyChange = (next: PingFrequency) => {
    setFrequency(next);
    try {
      localStorage.setItem(FREQUENCY_KEY, next);
    } catch {
      // ignore
    }
  };

  const handleDndToggle = () => {
    const next = !dndInChat;
    setDndInChat(next);
    try {
      localStorage.setItem(DND_IN_CHAT_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const toggleAllowed = (id: string) => {
    setAllowedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveAllowedPingIds(next);
      return next;
    });
  };

  const triggerPing = useCallback(
    (ids: string[], isManualTest = false) => {
      if (ids.length === 0) return;

      // 1. KURAL: Kullanıcı sohbetteyse ve "Sohbette Rahatsız Etme (DND)" açıksa test harici otomatik popup basma!
      if (!isManualTest && dndInChat && activeTab === "chat") {
        return;
      }

      // 2. KURAL: Aktif olarak konuşulan karakter kullanıcıya dışarıdan arama/mesaj atamaz!
      const validCandidates = ids.filter((id) => {
        if (!isManualTest && activeTab === "chat" && currentChatCharacterId) {
          const normActive = currentChatCharacterId.replace("demo-", "").toLowerCase();
          const normTarget = id.replace("demo-", "").toLowerCase();
          if (
            normActive === normTarget ||
            normActive.includes(normTarget) ||
            normTarget.includes(normActive)
          ) {
            return false;
          }
        }

        // 3. KURAL: Karakter bazlı cooldown (En az 12 dakika aynı karakter arayamaz)
        if (!isManualTest) {
          const lastPing = characterCooldownsRef.current[id];
          if (lastPing && Date.now() - lastPing < 12 * 60 * 1000) {
            return false;
          }
        }

        return true;
      });

      if (validCandidates.length === 0) return;

      const characterId = validCandidates[Math.floor(Math.random() * validCandidates.length)];
      const type = Math.random() < 0.5 ? "incoming_call" : "sms";
      const event = buildPing(characterId, type);
      if (!event) return;

      characterCooldownsRef.current[characterId] = Date.now();
      lastAnyPingTimeRef.current = Date.now();
      setActivePing(event);
      playNotificationTone(event.type);
    },
    [activeTab, currentChatCharacterId, dndInChat]
  );

  // Manuel test butonu
  useEffect(() => {
    if (externalTriggerIndex <= 0) return;
    const ids = getAllowedPingIds();
    if (ids.length === 0) {
      onSettingsOpenChange(true);
      return;
    }
    triggerPing(ids, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTriggerIndex]);

  // Otomatik bildirim döngüsü (Seçilen sıklığa göre dengeli ve akıllı)
  useEffect(() => {
    if (!enabled || frequency === "silent") return;

    // Sıklık süreleri:
    // fast: 2.5 dk (150s), first: 90s
    // balanced: 5.5 dk (330s), first: 180s
    // rare: 11 dk (660s), first: 300s
    const intervalMs =
      frequency === "fast" ? 150000 : frequency === "rare" ? 660000 : 330000;
    const firstDelayMs =
      frequency === "fast" ? 90000 : frequency === "rare" ? 300000 : 180000;

    const run = () => {
      // Global cooldown: En son herhangi bir bildirim geldiyse en az 3 dakika bekle
      if (Date.now() - lastAnyPingTimeRef.current < 180000) return;
      triggerPing(getAllowedPingIds());
    };

    const first = setTimeout(run, firstDelayMs);
    const interval = setInterval(run, intervalMs);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [enabled, frequency, triggerPing]);

  const handleDismiss = () => {
    if (activePing) {
      // Reddedildiğinde de cooldown uygula
      characterCooldownsRef.current[activePing.characterId] = Date.now();
    }
    setActivePing(null);
  };

  const handleAccept = () => {
    if (!activePing) return;
    const target = activePing;

    // Mesajı doğru karakterin sohbet geçmişine ekle
    try {
      const key = `kael_chat_history_${target.characterId}`;
      const raw = localStorage.getItem(key);
      const history = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        key,
        JSON.stringify([
          ...history.slice(-38),
          {
            id: `ping-msg-${Date.now()}`,
            role: "assistant",
            content: target.message,
            created_at: new Date().toISOString(),
          },
        ])
      );
    } catch {
      // ignore
    }

    if (target.type === "incoming_call") {
      speakWithNeuralVoice({
        text: target.message,
        voiceId: target.voiceId,
        filterOverride: "phone",
      });
    }

    characterCooldownsRef.current[target.characterId] = Date.now();
    setActivePing(null);
    onAcceptPingAndOpenChat(target.characterId, target.message, target.type);
  };

  const pingCandidates = useMemo(
    () => FALLBACK_PERSONAS.filter((p) => DYNAMIC_PING_CATALOG[p.id]),
    []
  );

  return (
    <>
      {/* Ayarlar: hangi karakterler beni arayabilir? */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => onSettingsOpenChange(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-purple-500/40 bg-neutral-900 p-5 text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="size-4 text-purple-300" />
                  <h3 className="text-sm font-extrabold">Canlı İletişim & Arama Ayarları</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSettingsOpenChange(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Master Toggle */}
              <button
                type="button"
                onClick={onToggleEnabled}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                  enabled
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : "bg-neutral-950 border-white/10 text-neutral-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  {enabled ? <Bell className="size-4 text-emerald-400" /> : <BellOff className="size-4" />}
                  Otomatik Canlı Bildirimler
                </span>
                <span>{enabled ? "AÇIK" : "KAPALI"}</span>
              </button>

              {/* DND during chat toggle */}
              <button
                type="button"
                onClick={handleDndToggle}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                  dndInChat
                    ? "bg-purple-950/40 border-purple-500/40 text-purple-200"
                    : "bg-neutral-950 border-white/10 text-neutral-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-purple-400" />
                  Sohbetteyken Rahatsız Etme (DND)
                </span>
                <span className="text-[11px] font-mono">
                  {dndInChat ? "AKTİF (Aramaz)" : "PASİF"}
                </span>
              </button>

              {/* Frequency Selector */}
              <div className="space-y-1.5 p-3 rounded-xl bg-neutral-950 border border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-amber-400" />
                    Arama & Bildirim Sıklığı
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "rare", label: "Nadir (11 dk)" },
                      { id: "balanced", label: "Dengeli (5.5 dk)" },
                      { id: "fast", label: "Sık (2.5 dk)" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFrequencyChange(f.id)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        frequency === f.id
                          ? "bg-purple-600 border-purple-400 text-white shadow-sm"
                          : "bg-white/[0.03] border-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-neutral-300">
                  Beni Arayabilecek İzinli Karakterler:
                </p>
                <p className="text-[10px] text-neutral-400">
                  Yalnızca izin verdiğin karakterler uygun zamanda arar ve aynı mesajı tekrarlamaz.
                </p>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {pingCandidates.map((p) => {
                  const on = allowedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleAllowed(p.id)}
                      className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        on
                          ? "bg-purple-950/50 border-purple-500/60"
                          : "bg-neutral-950 border-white/10 hover:border-white/25"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-8 border border-white/15">
                          <AvatarImage src={p.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback>{p.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold truncate">{shortName(p.name)}</span>
                      </span>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                          on ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {on ? "✓ İzinli" : "Kapalı"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button
                size="sm"
                disabled={allowedIds.length === 0}
                onClick={() => {
                  onSettingsOpenChange(false);
                  triggerPing(allowedIds, true);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold h-9 rounded-xl cursor-pointer"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                İzinli Karakterden Şimdi Test Araması Al
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gelen arama / mesaj bildirimi kartı */}
      <AnimatePresence>
        {activePing && (
          <motion.div
            key={activePing.id}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-3xl border border-purple-500/50 bg-neutral-900/95 backdrop-blur-2xl p-4 text-white shadow-[0_15px_50px_rgba(168,85,247,0.35)]"
          >
            {/* Top Bar with Dismiss X */}
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-purple-500/40 text-purple-200 bg-purple-950/40"
              >
                {activePing.locationLabel}
              </Badge>
              <button
                type="button"
                onClick={handleDismiss}
                className="size-6 rounded-full hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition cursor-pointer"
                title="Kapat"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <Avatar className="size-12 border-2 border-purple-400 shrink-0 shadow-lg">
                <AvatarImage src={activePing.characterAvatar} className="object-cover" />
                <AvatarFallback className="bg-purple-950 text-purple-200 font-bold">
                  {activePing.characterName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-white truncate">
                  {activePing.characterName}
                </h4>
                <p className="text-xs text-neutral-200 mt-1 line-clamp-3 leading-relaxed italic">
                  &ldquo;{activePing.message}&rdquo;
                </p>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2">
              {activePing.type === "incoming_call" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDismiss}
                    className="flex-1 border-red-500/40 bg-red-950/30 hover:bg-red-900/50 text-red-200 text-xs font-bold h-9 rounded-xl cursor-pointer"
                  >
                    <PhoneOff className="size-3.5 mr-1.5" />
                    Reddet
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <PhoneCall className="size-3.5 mr-1.5" />
                    Aramayı Aç
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      speakWithNeuralVoice({
                        text: activePing.message,
                        voiceId: activePing.voiceId,
                      })
                    }
                    className="bg-white/5 hover:bg-white/10 text-purple-200 text-xs h-9 px-3 rounded-xl cursor-pointer"
                  >
                    <Volume2 className="size-3.5 mr-1" /> Dinle
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs h-9 rounded-xl cursor-pointer"
                  >
                    <MessageSquare className="size-3.5 mr-1.5" />
                    Hemen Yanıtla
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
