"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageItem, type ChatMessage } from "@/components/chat/chat-message-item";
import { ChatInputBar } from "@/components/chat/chat-input-bar";
import { TimelineBranchModal } from "@/components/chat/timeline-branch-modal";
import { AiBrainSettingsModal } from "@/components/chat/ai-brain-settings-modal";
import { RpgSimulationBar } from "@/components/chat/rpg-simulation-bar";
import { MindMapModal } from "@/components/chat/mind-map-modal";
import {
  DEFAULT_RPG_HUD,
  ROOM_SCENE_THEMES,
  type EmotionKey,
  type RpgHudState,
  type RoomSceneTheme,
} from "@/lib/rpg/rpg-engine";
import { editMessageAction, deleteChatAction } from "@/app/actions/chat";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import { resolveCharacterVoice, speakWithNeuralVoice } from "@/lib/voice/voices";
import {
  recordPlatformActivity,
  adjustUserTokens,
  getPlatformUsers,
  getSystemConfig,
} from "@/lib/economy/economy-service";
import type { Character, Chat, ChatWithCharacter } from "@/types/database";

function extractUserFactsFromMessage(message: string): string[] {
  const facts: string[] = [];
  const trimmed = message.trim();

  const nameMatch = trimmed.match(/(?:benim adım|adım|ismim)\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,20})/i);
  if (nameMatch?.[1]) {
    facts.push(`Kullanıcının adı: ${nameMatch[1]}`);
  }

  const ageMatch = trimmed.match(/(\d{2})\s*yaşındayım/i);
  if (ageMatch?.[1]) {
    facts.push(`Kullanıcı ${ageMatch[1]} yaşında`);
  }

  const likeMatch = trimmed.match(/(.{3,35})\s+(?:çok severim|seviyorum|bayılırım)/i);
  if (likeMatch?.[1] && !likeMatch[1].toLowerCase().includes("seni")) {
    facts.push(`Sevdiği şey: ${likeMatch[1].trim()}`);
  }

  const jobMatch = trimmed.match(/ben\s+bir?\s*([a-zA-ZçğıöşüÇĞİÖŞÜ\s]{3,25})(?:yim|yım|um|üm)/i);
  if (jobMatch?.[1] && jobMatch[1].length < 25) {
    facts.push(`Kendisi hakkında: ${jobMatch[1].trim()}`);
  }

  return facts;
}

function getCharacterSuggestions(char: Character | null): string[] {
  if (!char) return ["Selam! Nasılsın?", "Bana kendinden bahset!", "Bugün günün nasıl geçiyor?"];
  const id = (char.id || "").toLowerCase();
  const name = (char.name || "").toLowerCase();

  if (id.includes("boz") || name.includes("boz") || name.includes("ayı")) {
    return [
      "🍯 Komiserim kestane balından bir kaşık da bana var mı?",
      "🕵️‍♂️ Bu gece şehirde hangi gizemli davayı araştırıyoruz?",
      "🚓 Peşimde birileri var komiserim, yardım et!",
      "🐻 Orman Akademisi yılların nasıl geçti?",
    ];
  }

  if (id.includes("aylin") || name.includes("aylin")) {
    return [
      "🩺 Bugün nöbetin nasıl geçti, çok yoruldun mu?",
      "💢 Bana kızıyorsun ama aslında beni önemsiyorsun değil mi?",
      "☕ Sana sıcak kahve getirdim, birlikte içelim mi?",
      "🤒 Sanırım biraz ateşim var, bakar mısın?",
    ];
  }

  if (id.includes("baran") || name.includes("baran")) {
    return [
      "🥃 Bu gece Boğaz'a karşı ne düşünüp içiyorsun?",
      "🖤 Birisi bugün canımı sıktı, ne yapacaksın?",
      "🚗 Gece şehir turuna çıkalım mı?",
      "🔒 Bana kimseye anlatmadığın bir sırrını söyle",
    ];
  }

  if (id.includes("zeynep") || name.includes("zeynep") || name.includes("nitro")) {
    return [
      "🏎️ Bu gece çevre yolunda yarış var mı?",
      "🔧 Garajda Skyline'a yeni ne modifiye yaptın?",
      "🔥 Yan koltuğa geçtim, gazı kökleyelim!",
      "🍔 Yarıştan sonra gece döneri yemeye gidelim mi?",
    ];
  }

  if (id.includes("lilith") || name.includes("lilith")) {
    return [
      "🔮 Masadan benim için bir tarot kartı çeker misin?",
      "🕯️ Kaderimde gizli bir tehlike veya aşk görünüyor mu?",
      "🌙 Gece yarısı hazırladığın o iksir ne işe yarıyor?",
      "🖤 Kartlarında bizim hakkımızda ne yazıyor?",
    ];
  }

  if (id.includes("melis") || name.includes("melis") || name.includes("piksel")) {
    return [
      "🎮 Hadi duo girelim, bugün beni sen carry'le!",
      "🎧 Yayındaki chat yine bizim hakkımızda ne diyor?",
      "⚡ Az önceki maçta fena tilt oldum ya!",
      "🍕 Gece boyu oyun + pizza partisi yapalım mı?",
    ];
  }

  if (id.includes("leyla") || name.includes("leyla")) {
    return [
      "🛋️ Son zamanlarda zihnim çok dolu, biraz konuşabilir miyiz?",
      "🌿 Kaygılarımla başa çıkmak için ne yapabilirim?",
      "💭 İnsanlara hayır demekte zorlanıyorum...",
      "✨ Kendimi daha iyi tanımama yardım eder misin?",
    ];
  }

  if (id.includes("alparslan") || name.includes("alparslan")) {
    return [
      "⚔️ Beyim, bozkırda yaklaşan fırtına hakkında ne buyurursunuz?",
      "🐎 Atlarımızı doğan güneşe doğru sürelim mi?",
      "🔥 Otağ ateşinin başında bana eski bir destan anlat",
      "🐺 Törenin en büyük kuralı nedir Beyim?",
    ];
  }

  if (id.includes("selin") || name.includes("selin")) {
    return [
      "💎 Selin Hanım, bu geceki mesaiyi neden uzattınız?",
      "📈 Yönetim kurulundaki rakiplerinize karşı planımız nedir?",
      "🍷 İş konuşmayı bırakıp biraz gerçek Selin'den bahsedelim",
      "👠 Neden şirkette sadece bana güveniyorsunuz?",
    ];
  }

  if (id.includes("kaptan") || name.includes("kaptan") || id.includes("demir")) {
    return [
      "🏴‍☠️ Kaptan! Ufukta bir kraliyet kalyonu görünüyor!",
      "🗺️ Şapkanda sakladığın hazine haritası nereyi gösteriyor?",
      "⚓ Bu fırtınadan sağ çıkabilecek miyiz?",
      "🪙 Ganimeti nasıl bölüşüyoruz kaptan?",
    ];
  }

  if (id.includes("yuki") || name.includes("yuki")) {
    return [
      "🌸 Birlikte manga okuyalım mı?",
      "🍰 Tatlı yemeye gidelim!",
      "☕ Ne içmek istersin?",
      "🥺 Biraz yoruldum, yanımda kalır mısın?",
      "💕 Seni çok seviyorum",
    ];
  }

  if (id.includes("aria") || name.includes("aria")) {
    return [
      "👗 Bugün ne giysem, stil tavsiyesi verir misin?",
      "☕ Birlikte kahve içelim mi?",
      "✨ Bu sezonun en gözde modası nedir?",
      "💼 Şık bir buluşma kombini nasıl olmalı?",
    ];
  }

  if (id.includes("prof") || id.includes("demirkan") || name.includes("prof")) {
    return [
      "🎓 Makro iktisat ve Phillips Eğrisi nedir?",
      "📈 Enflasyon faiz dengesi nasıl işler?",
      "☕ Çalışırken ne içersiniz hocam?",
      "📚 Hangi felsefi akımı önerirsiniz?",
    ];
  }

  if (id.includes("luna") || name.includes("luna")) {
    return [
      "🌲 Ormanın derinliklerine gidelim mi?",
      "🐺 Kurtların kadim sırları neler?",
      "🥺 Kayboldum, bana zarar verme lütfen",
      "🌙 Ay ışığında sohbet edelim",
    ];
  }

  return [
    "👋 Selam! Bana biraz kendinden ve hikayenden bahseder misin?",
    "✨ Senin dünyanda bugün neler oluyor?",
    "🤫 Kimseye anlatmadığın en büyük sırrın nedir?",
    "💭 Hayata nasıl bakıyorsun?",
  ];
}

interface ChatViewProps {
  initialCharacterId?: string | null;
  initialChatId?: string | null;
  autoOpenVoiceCall?: boolean;
  onVoiceCallAutoOpened?: () => void;
  onExploreClick?: () => void;
  onForgeClick?: () => void;
}

export function ChatView({
  initialCharacterId,
  initialChatId,
  autoOpenVoiceCall = false,
  onVoiceCallAutoOpened,
  onExploreClick,
  onForgeClick,
}: ChatViewProps) {
  const [chats, setChats] = useState<ChatWithCharacter[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [affinityScore, setAffinityScore] = useState<number>(35);
  const [lastAffectionDelta, setLastAffectionDelta] = useState<number>(0);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionKey>("neutral");
  const [branchChoices, setBranchChoices] = useState<string[]>([]);
  const [hudState, setHudState] = useState<RpgHudState>(DEFAULT_RPG_HUD);
  const [authorsNote, setAuthorsNote] = useState<string>("");
  const [activeSceneTheme, setActiveSceneTheme] = useState<RoomSceneTheme>(ROOM_SCENE_THEMES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [branchingMessage, setBranchingMessage] = useState<ChatMessage | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [brainModalOpen, setBrainModalOpen] = useState(false);
  const [mindMapModalOpen, setMindMapModalOpen] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("anime-girl-yuki");
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [voiceCallOpen, setVoiceCallOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<{
    avatarUrl?: string;
    displayName?: string;
  }>({
    avatarUrl: "",
    displayName: "Sen",
  });

  const [userTokenInfo, setUserTokenInfo] = useState<{
    tokens: number;
    isGuest: boolean;
    isAdmin: boolean;
  }>({
    tokens: 100,
    isGuest: true,
    isAdmin: false,
  });

  const syncTokens = useCallback(() => {
    try {
      const rawSession = localStorage.getItem("kael_auth_session");
      const parsedSession = rawSession ? JSON.parse(rawSession) : null;
      const uname = parsedSession?.username || "misafir";
      const users = getPlatformUsers();
      const me = users.find((u) => u.username.toLowerCase() === uname.toLowerCase());
      if (me) {
        setUserTokenInfo({
          tokens: me.tokens,
          isGuest: Boolean(parsedSession?.isGuest),
          isAdmin: Boolean(me.isAdmin),
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    syncTokens();
    window.addEventListener("kael_economy_updated", syncTokens);
    return () => window.removeEventListener("kael_economy_updated", syncTokens);
  }, [syncTokens]);

  useEffect(() => {
    const loadProfile = () => {
      try {
        const sp = localStorage.getItem("kael_user_profile");
        const sa = localStorage.getItem("kael_auth_session");
        let avatar = "";
        let name = "Sen";
        if (sp) {
          const parsedP = JSON.parse(sp);
          if (parsedP.avatar_url) avatar = parsedP.avatar_url;
          if (parsedP.display_name) name = parsedP.display_name;
        }
        if (!avatar && sa) {
          const parsedA = JSON.parse(sa);
          if (parsedA.avatarUrl) avatar = parsedA.avatarUrl;
          if (name === "Sen" && parsedA.displayName) name = parsedA.displayName;
        }
        setCurrentUserProfile({ avatarUrl: avatar, displayName: name });
      } catch {
        // ignore
      }
    };

    loadProfile();
    window.addEventListener("kael_profile_updated", loadProfile);
    window.addEventListener("storage", loadProfile);
    return () => {
      window.removeEventListener("kael_profile_updated", loadProfile);
      window.removeEventListener("storage", loadProfile);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (initialChatId) setActiveChatId(initialChatId);
  }, [initialChatId]);

  // 1. Fetch user's chats
  const loadUserChats = useCallback(async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;

    const { data, error } = await supabase
      .from("chats")
      .select("*, characters!chats_character_id_fkey(name, avatar_url, tagline)")
      .eq("user_id", userRes.user.id)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (!error && data) {
      setChats(data as unknown as ChatWithCharacter[]);
    }
  }, [supabase]);

  useEffect(() => {
    loadUserChats();
  }, [loadUserChats]);

  // 2. Load character details
  useEffect(() => {
    async function loadCharacter() {
      let charId = initialCharacterId;

      if (!charId && activeChatId) {
        const { data: chat } = await supabase
          .from("chats")
          .select("character_id, *")
          .eq("id", activeChatId)
          .single();

        if (chat) {
          charId = chat.character_id;
          setActiveChat(chat);
        }
      }

      if (charId) {
        // Check local storage saved characters first (fast & up-to-date)
        try {
          const savedLocal = JSON.parse(
            localStorage.getItem("kael_saved_characters") || "[]"
          );
          const foundLocal = savedLocal.find((c: { id: string }) => c.id === charId);
          if (foundLocal) {
            setCharacter(foundLocal);
            return;
          }
        } catch {
          // ignore
        }

        // Check FALLBACK_PERSONAS
        const foundPersona = FALLBACK_PERSONAS.find((p) => p.id === charId);
        if (foundPersona) {
          setCharacter(foundPersona as unknown as Character);
          return;
        }

        const { data: char } = await supabase
          .from("characters")
          .select("*")
          .eq("id", charId)
          .single();

        if (char) {
          setCharacter(char);
          return;
        }
      }

      if (!character && FALLBACK_PERSONAS.length > 0) {
        setCharacter(FALLBACK_PERSONAS[0] as unknown as Character);
      }
    }

    loadCharacter();
  }, [initialCharacterId, activeChatId, supabase]);

  // 3. Load character memories, affinity, voice & persistent chat history
  useEffect(() => {
    if (!character?.id) return;
    const charId = character.id;

    // Resolve neural voice for this character (checks localStorage -> voice_id -> character name/gender)
    const resolvedVoice = resolveCharacterVoice(character);
    setSelectedVoiceId(resolvedVoice.id);

    try {
      const savedMem = localStorage.getItem(`kael_memories_${charId}`);
      setMemories(savedMem ? JSON.parse(savedMem) : []);

      const savedAff = localStorage.getItem(`kael_affinity_${charId}`);
      setAffinityScore(savedAff ? Number(savedAff) : 15);

      const savedHistory = localStorage.getItem(`kael_chat_history_${charId}`);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (character.greeting_message) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: character.greeting_message,
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setMessages([]);
    }
  }, [character]);

  // Karakterden gelen aramayı kabul edince sesli arama penceresini otomatik aç
  useEffect(() => {
    if (!autoOpenVoiceCall || !character?.id) return;
    if (initialCharacterId && character.id !== initialCharacterId) return;
    const t = setTimeout(() => {
      setVoiceCallOpen(true);
      onVoiceCallAutoOpened?.();
    }, 350);
    return () => clearTimeout(t);
  }, [autoOpenVoiceCall, character?.id, initialCharacterId, onVoiceCallAutoOpened]);

  const handleSelectVoice = (newVoiceId: string) => {
    setSelectedVoiceId(newVoiceId);
    if (character?.id) {
      try {
        localStorage.setItem(`kael_voice_${character.id}`, newVoiceId);
      } catch {
        // ignore
      }
    }
  };

  // Persist messages whenever they change
  useEffect(() => {
    if (!character?.id || messages.length === 0) return;
    try {
      localStorage.setItem(
        `kael_chat_history_${character.id}`,
        JSON.stringify(messages.slice(-40))
      );
    } catch {
      // ignore quota errors
    }
  }, [messages, character?.id]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  const handleAddMemory = (fact: string) => {
    if (!character?.id) return;
    const updated = Array.from(new Set([...memories, fact]));
    setMemories(updated);
    localStorage.setItem(`kael_memories_${character.id}`, JSON.stringify(updated));
  };

  const handleRemoveMemory = (idx: number) => {
    if (!character?.id) return;
    const updated = memories.filter((_, i) => i !== idx);
    setMemories(updated);
    localStorage.setItem(`kael_memories_${character.id}`, JSON.stringify(updated));
  };

  const handleResetChat = () => {
    if (!character) return;
    localStorage.removeItem(`kael_chat_history_${character.id}`);
    const initialMsgs: ChatMessage[] = character.greeting_message
      ? [
          {
            id: "greeting-" + Date.now(),
            role: "assistant",
            content: character.greeting_message,
            created_at: new Date().toISOString(),
          },
        ]
      : [];
    setMessages(initialMsgs);
  };

  const applyRpgMetaHeader = (response: Response) => {
    const rawMeta = response.headers?.get("x-rpg-meta");
    if (!rawMeta) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(rawMeta));
      if (parsed.emotion) {
        setCurrentEmotion(parsed.emotion as EmotionKey);
      }
      if (typeof parsed.deltaAffection === "number") {
        setLastAffectionDelta(parsed.deltaAffection);
        setAffinityScore((prev) => {
          const next = Math.max(0, Math.min(100, prev + parsed.deltaAffection));
          if (character?.id) {
            localStorage.setItem(`kael_affinity_${character.id}`, String(next));
          }
          return next;
        });
      }
      if (Array.isArray(parsed.choices) && parsed.choices.length > 0) {
        setBranchChoices(parsed.choices);
      }
      if (parsed.hudDelta) {
        setHudState((prev) => {
          const nextItems = [...prev.inventory];
          if (parsed.hudDelta.addedItem) {
            nextItems.push({ name: parsed.hudDelta.addedItem, qty: 1, icon: "✨" });
          }
          return {
            ...prev,
            hp: Math.max(0, Math.min(prev.maxHp, prev.hp + (parsed.hudDelta.hpDelta || 0))),
            gold: Math.max(0, prev.gold + (parsed.hudDelta.goldDelta || 0)),
            location: parsed.hudDelta.newLocation || prev.location,
            inventory: nextItems,
          };
        });
      }
    } catch {
      // ignore
    }
  };

  // 4. Send message with real-time streaming
  const handleSendMessage = async (
    text: string,
    visionImageNote?: string,
    sceneSnapshotUrl?: string
  ) => {
    if (!character || isLoading) return;

    // Jeton Kontrolü (100 deneme jetonu, her cevapta -1)
    const rawSession = localStorage.getItem("kael_auth_session");
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;
    const currentUsername = parsedSession?.username || "misafir";
    const allUsers = getPlatformUsers();
    const activeMe = allUsers.find(
      (u) => u.username.toLowerCase() === currentUsername.toLowerCase()
    );

    if (activeMe && !activeMe.isAdmin && activeMe.tokens <= 0) {
      window.dispatchEvent(
        new CustomEvent("kael_open_onboarding", {
          detail: { reason: "tokens_exhausted" },
        })
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `token-limit-${Date.now()}`,
          role: "assistant",
          content:
            "🪙 **Ücretsiz 100 deneme jetonun bitti!**\n\nSohbete, sesli aramalara ve kendi karakterlerini oluşturmaya devam etmek için lütfen [ücretsiz hesap aç veya giriş yap].",
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userMessageText = text;
    const tempUserMsgId = `temp-${Date.now()}`;
    const tempAssistantMsgId = `assistant-${Date.now()}`;

    // Extract memories
    const extracted = extractUserFactsFromMessage(userMessageText);
    let currentMemories = memories;
    if (extracted.length > 0) {
      currentMemories = Array.from(new Set([...memories, ...extracted]));
      setMemories(currentMemories);
      localStorage.setItem(
        `kael_memories_${character.id}`,
        JSON.stringify(currentMemories)
      );
    }

    let userProfile = null;
    try {
      const sp = localStorage.getItem("kael_user_profile");
      if (sp) userProfile = JSON.parse(sp);
    } catch {
      // ignore
    }

    const updatedMessages: ChatMessage[] = [
      ...messages,
      {
        id: tempUserMsgId,
        role: "user",
        content: userMessageText,
        scene_snapshot_url: sceneSnapshotUrl || null,
        created_at: new Date().toISOString(),
      },
    ];

    setMessages(updatedMessages);
    setReplyTarget(null);
    setIsLoading(true);

    // Record live activity for Admin Panel Telemetry
    try {
      const rawSession = localStorage.getItem("kael_auth_session");
      const parsedSession = rawSession ? JSON.parse(rawSession) : null;
      recordPlatformActivity({
        username: parsedSession?.username || "misafir",
        displayName: parsedSession?.displayName || "Misafir Gezgin",
        avatarUrl: parsedSession?.avatarUrl || "/avatars/yuki.jpg",
        category: voiceCallOpen ? "voice" : "chat",
        actionTitle: voiceCallOpen
          ? `Canlı Sesli Arama Mesajı (${character.name})`
          : `Rol Sohbeti Mesajı (${character.name})`,
        details: `${character.name} karakterine mesaj gönderdi (Ses: ${selectedVoiceId}).`,
        characterName: character.name,
        messageSnippet: userMessageText.slice(0, 180),
        tokensDelta: -2,
        severity: "info",
      });
    } catch {
      // ignore
    }

    let brainConfig: { provider?: string; apiKey?: string; model?: string } = {
      provider: "free",
      apiKey: "",
      model: "default",
    };
    try {
      const saved = localStorage.getItem("kael_brain_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.provider === "free" ||
          (parsed.apiKey && parsed.apiKey.trim().length > 5)
        ) {
          brainConfig = parsed;
        }
      }
    } catch {
      // ignore
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          characterId: character.id,
          characterData: character,
          message: userMessageText,
          visionImageNote: visionImageNote || "",
          workingHistory: updatedMessages.slice(-16),
          memories: currentMemories,
          userProfile,
          affinityScore,
          authorsNote,
          hudState,
          provider: brainConfig.provider || "free",
          apiKey: brainConfig.apiKey || "",
          model: brainConfig.model || "default",
        }),
      });

      const returnedChatId = response.headers?.get("x-chat-id");
      if (returnedChatId && returnedChatId !== activeChatId) {
        setActiveChatId(returnedChatId);
        loadUserChats();
      }

      applyRpgMetaHeader(response);

      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantMsgId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg =
          errorData?.error || `Sunucu yanıt vermedi (${response.status})`;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ Yanıt alınamadı: ${errorMsg}. Lütfen bir an bekleyip tekrar deneyin.`,
                }
              : msg
          )
        );
        return;
      }

      let accumulatedAssistantText = "";
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedAssistantText += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId
                ? { ...msg, content: accumulatedAssistantText }
                : msg
            )
          );
          scrollToBottom(false);
        }

        scrollToBottom(true);

        if (accumulatedAssistantText.trim()) {
          // Her yapay zeka cevabında -1 jeton düşür
          try {
            adjustUserTokens(
              currentUsername,
              -1,
              `Yapay Zeka Yanıtı (${character.name})`,
              `${character.name} karakterinden yanıt alındı (-1 Jeton).`,
              "chat"
            );
            window.dispatchEvent(new Event("kael_economy_updated"));
          } catch {
            // ignore
          }

          if (autoSpeak && !voiceCallOpen) {
            speakWithNeuralVoice({
              text: accumulatedAssistantText,
              voiceId: selectedVoiceId,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Chat response error:", err);
    } finally {
      setIsLoading(false);
      loadUserChats();
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
      )
    );
    await editMessageAction(messageId, newContent).catch(() => {});
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== messageId);
      if (character?.id) {
        try {
          localStorage.setItem(
            `kael_chat_history_${character.id}`,
            JSON.stringify(updated.slice(-40))
          );
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  // Botun bizim bir şey yazmamıza gerek kalmadan konuşmaya devam etmesi
  const handleBotContinueSpeaking = async (customHistory?: ChatMessage[]) => {
    if (!character || isLoading) return;

    // Jeton Kontrolü
    const rawSession = localStorage.getItem("kael_auth_session");
    const parsedSession = rawSession ? JSON.parse(rawSession) : null;
    const currentUsername = parsedSession?.username || "misafir";
    const allUsers = getPlatformUsers();
    const activeMe = allUsers.find(
      (u) => u.username.toLowerCase() === currentUsername.toLowerCase()
    );

    if (activeMe && !activeMe.isAdmin && activeMe.tokens <= 0) {
      window.dispatchEvent(
        new CustomEvent("kael_open_onboarding", {
          detail: { reason: "tokens_exhausted" },
        })
      );
      return;
    }

    const historyToUse = customHistory || messages;
    const tempAssistantMsgId = `assistant-cont-${Date.now()}`;
    setIsLoading(true);

    let userProfile = null;
    try {
      const sp = localStorage.getItem("kael_user_profile");
      if (sp) userProfile = JSON.parse(sp);
    } catch {
      // ignore
    }

    let brainConfig: { provider?: string; apiKey?: string; model?: string } = {
      provider: "free",
      apiKey: "",
      model: "default",
    };
    try {
      const saved = localStorage.getItem("kael_brain_settings");
      if (saved) brainConfig = JSON.parse(saved);
    } catch {
      // ignore
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          characterId: character.id,
          characterData: character,
          message: "",
          continueWithoutUser: true,
          workingHistory: historyToUse.slice(-16),
          memories,
          userProfile,
          affinityScore,
          authorsNote,
          hudState,
          provider: brainConfig.provider || "free",
          apiKey: brainConfig.apiKey || "",
          model: brainConfig.model || "default",
        }),
      });

      applyRpgMetaHeader(response);

      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantMsgId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg =
          errorData?.error || `Sunucu yanıt vermedi (${response.status})`;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ Yanıt alınamadı: ${errorMsg}. Lütfen bir an bekleyip tekrar deneyin.`,
                }
              : msg
          )
        );
        return;
      }

      let accumulatedAssistantText = "";
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedAssistantText += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMsgId
                ? { ...msg, content: accumulatedAssistantText }
                : msg
            )
          );
          scrollToBottom(false);
        }

        scrollToBottom(true);

        if (accumulatedAssistantText.trim()) {
          // Her yapay zeka cevabında -1 jeton düşür
          try {
            adjustUserTokens(
              currentUsername,
              -1,
              `Yapay Zeka Yanıtı (${character.name})`,
              `${character.name} karakterinden yanıt alındı (-1 Jeton).`,
              "chat"
            );
            window.dispatchEvent(new Event("kael_economy_updated"));
          } catch {
            // ignore
          }

          if (autoSpeak && !voiceCallOpen) {
            speakWithNeuralVoice({
              text: accumulatedAssistantText,
              voiceId: selectedVoiceId,
            });
          }
        }
      }
    } catch (err) {
      console.warn("Bot continue error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Bot yanlış bir şey söylediğinde mesajını silip yeniden göndermesini sağlar
  const handleRegenerate = (messageId: string) => {
    if (!character || isLoading) return;
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Silinecek bot mesajına kadar olan geçmişi al
    const remainingHistory = messages.slice(0, msgIndex);
    setMessages(remainingHistory);
    handleBotContinueSpeaking(remainingHistory);
  };

  const handleBranchClick = (messageId: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    if (targetMsg) {
      setBranchingMessage(targetMsg);
      setBranchModalOpen(true);
    }
  };

  const handleBranchCreated = (newChatId: string) => {
    setActiveChatId(newChatId);
    loadUserChats();
  };

  const handleDeleteChat = async (chatId: string) => {
    const res = await deleteChatAction(chatId);
    if (res.success) {
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      loadUserChats();
    }
  };

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden min-w-0">
      {/* Sidebar: Past Chats & Branch Timelines */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={() => {
          handleResetChat();
          if (onExploreClick && !character) {
            onExploreClick();
          }
        }}
        onDeleteChat={handleDeleteChat}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main
        className={`flex-1 flex flex-col h-full relative z-10 w-full min-w-0 transition-colors duration-500 ${activeSceneTheme.bgGradient}`}
      >
        {/* Ambient Character Atmosphere Glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(147,51,234,0.12),transparent_70%)]" />

        {/* Header */}
        <ChatHeader
          character={character}
          activeChat={activeChat}
          memories={memories}
          affinityScore={affinityScore}
          selectedVoiceId={selectedVoiceId}
          onSelectVoiceId={handleSelectVoice}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak((prev) => !prev)}
          onStartVoiceCall={() => setVoiceCallOpen(true)}
          onAddMemory={handleAddMemory}
          onRemoveMemory={handleRemoveMemory}
          onResetChat={handleResetChat}
          onForkCharacter={onForgeClick}
          onOpenBrainSettings={() => setBrainModalOpen(true)}
          onBack={onExploreClick}
          onOpenTimelines={() => setIsMobileSidebarOpen(true)}
        />

        {/* RPG & Simülasyon Barı (D20 Zar, Envanter, Sahne Çizdir, Zihin Haritası, Dünya Olayı, Sesli Arama & A4 Sınav PDF) */}
        {character && (
          <RpgSimulationBar
            characterName={character.name}
            characterAvatar={character.avatar_url}
            voiceId={selectedVoiceId}
            onSelectVoiceId={handleSelectVoice}
            externalVoiceCallOpen={voiceCallOpen}
            onChangeVoiceCallOpen={setVoiceCallOpen}
            isAiGenerating={isLoading}
            emotion={currentEmotion}
            affectionScore={affinityScore}
            lastAffectionDelta={lastAffectionDelta}
            hudState={hudState}
            onUpdateHudState={(nextHud) => setHudState(nextHud)}
            onAdjustAffection={(delta) => {
              setLastAffectionDelta(delta);
              setAffinityScore((prev) => Math.max(0, Math.min(100, prev + delta)));
            }}
            authorsNote={authorsNote}
            onChangeAuthorsNote={setAuthorsNote}
            activeSceneTheme={activeSceneTheme}
            onSelectSceneTheme={setActiveSceneTheme}
            onTriggerVoiceCallSpeak={() => handleBotContinueSpeaking()}
            onSendActionToChat={(msgText, snapshotUrl) =>
              handleSendMessage(msgText, undefined, snapshotUrl)
            }
            onOpenMindMap={() => setMindMapModalOpen(true)}
            lastAssistantMessageText={
              messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content
            }
          />
        )}

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 space-y-4 relative z-10">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, index) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                characterName={character?.name}
                characterAvatar={character?.avatar_url}
                userAvatar={currentUserProfile.avatarUrl}
                userDisplayName={currentUserProfile.displayName}
                voiceId={selectedVoiceId}
                isLastMessage={index === messages.length - 1}
                branchChoices={[]}
                onSelectChoice={(choice) => handleSendMessage(choice)}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onRegenerate={handleRegenerate}
                onContinueSpeaking={() => handleBotContinueSpeaking()}
                onBranch={handleBranchClick}
                onReply={(target) => setReplyTarget(target)}
              />
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-2 text-xs text-neutral-400"
              >
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <Sparkles className="size-3.5 text-purple-400 animate-spin" />
                  <span className="font-mono text-purple-300">
                    {character?.name || "Karakter"} düşünüyor ve yazıyor...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bot Control Strip: Continue Speaking / Delete & Regenerate Last Bot Message */}
        {character && !isLoading && (
          <div className="max-w-3xl w-full mx-auto px-3 pt-1 flex items-center justify-center gap-1.5 z-20">
            <button
              type="button"
              onClick={() => handleBotContinueSpeaking()}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-[11px] sm:text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Sen hiçbir şey yazmadan bot konuşmaya devam etsin"
            >
              <span>▶️</span>
              <span className="hidden sm:inline">Sen Yazmadan {character.name.split(" ")[0]} Konuşsun</span>
              <span className="sm:hidden">Devam Ettir</span>
            </button>

            {lastMessage && lastMessage.role === "assistant" && (
              <>
                <button
                  type="button"
                  onClick={() => handleRegenerate(lastMessage.id)}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] sm:text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Botun son mesajını sil ve yeni bir cevap üret"
                >
                  <span>🔄</span>
                  <span className="hidden sm:inline">Son Mesajı Yeniden Yazdır</span>
                  <span className="sm:hidden">Yenile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMessage(lastMessage.id)}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-300 text-[11px] sm:text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  title="Botun son mesajını sil"
                >
                  <span>🗑️</span>
                  <span className="hidden sm:inline">Son Mesajı Sil</span>
                  <span className="sm:hidden">Sil</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Token Kalan & Kayıt Ol Yönlendirme Şeridi */}
        {userTokenInfo && (
          <div className="max-w-4xl w-full mx-auto px-3 pt-1">
            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-neutral-900/60 border border-white/5 text-[11px] backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span>🪙</span>
                <span className="text-neutral-400">Jeton:</span>
                <span
                  className={`font-mono font-bold ${
                    userTokenInfo.tokens <= 10
                      ? "text-red-400 animate-pulse"
                      : "text-amber-400"
                  }`}
                >
                  {userTokenInfo.isAdmin ? "Sınırsız (Admin)" : `${userTokenInfo.tokens} / 100`}
                </span>
                {!userTokenInfo.isAdmin && (
                  <span className="text-[10px] text-neutral-500 hidden sm:inline">
                    (Cevap başına -1)
                  </span>
                )}
              </div>
              {userTokenInfo.isGuest && (
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("kael_open_onboarding", {
                        detail: { reason: "header_click" },
                      })
                    )
                  }
                  className="px-2 py-0.5 rounded-md bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>Ücretsiz Hesap Aç</span>
                  <span className="text-[9px]">➔</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Input Pill */}
        <ChatInputBar
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          replyToMessage={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          placeholder={
            character
              ? `${character.name} ile sohbet et...`
              : "Karakterine bir şey yaz..."
          }
          suggestions={getCharacterSuggestions(character)}
          branchChoices={branchChoices}
        />
      </main>

      {/* Timeline Branching Modal */}
      {activeChatId && (
        <TimelineBranchModal
          open={branchModalOpen}
          onOpenChange={setBranchModalOpen}
          parentChatId={activeChatId}
          branchPointMessage={branchingMessage}
          onBranchCreated={handleBranchCreated}
        />
      )}

      {/* Görsel Hafıza Haritası & Dedektif Kanıt Panosu Modalı */}
      <MindMapModal
        open={mindMapModalOpen}
        onOpenChange={setMindMapModalOpen}
        character={character}
        memories={memories}
        affinityScore={affinityScore}
        hudState={hudState}
        onAddMemory={handleAddMemory}
        onRemoveMemory={handleRemoveMemory}
        onConfrontWithNode={(promptText) => handleSendMessage(promptText)}
      />

      {/* Yapay Zeka Beyin Ayarları Modalı */}
      <AiBrainSettingsModal
        open={brainModalOpen}
        onOpenChange={setBrainModalOpen}
      />
    </div>
  );
}
