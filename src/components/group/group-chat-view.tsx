"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Bot,
  Trash2,
  RotateCw,
  Play,
  Sparkles,
  Send,
  UserPlus,
  Shield,
  Flame,
  Check,
  X,
  Edit2,
  Coins,
  MessageSquarePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import type { CharacterWithCreator } from "@/types/database";

export interface GroupRoomMessage {
  id: string;
  role: "user" | "assistant" | "system";
  speaker_id: string;
  speaker_name: string;
  speaker_avatar?: string | null;
  content: string;
  created_at: string;
  is_edited?: boolean;
}

export interface GroupRoom {
  id: string;
  title: string;
  topic: string;
  botIds: string[];
  friendNames: { username: string; displayName: string; role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" }[];
  ambientMode: boolean;
}

export interface FriendContact {
  id: string;
  username: string;
  displayName: string;
  status: "ACCEPTED" | "PENDING" | "BLOCKED";
  avatar: string;
}

const DEFAULT_FRIENDS: FriendContact[] = [
  { id: "f1", username: "@emre_dev", displayName: "Emre Yılmaz", status: "ACCEPTED", avatar: "E" },
  { id: "f2", username: "@selin_art", displayName: "Selin Kaya", status: "ACCEPTED", avatar: "S" },
  { id: "f3", username: "@burak_rpg", displayName: "Burak Demir", status: "PENDING", avatar: "B" },
];

const INITIAL_ROOMS: GroupRoom[] = [
  {
    id: "room-police-cyber",
    title: "🚓 Gece Vardiyası & Siber Suç Masası",
    topic: "Metropoldeki gizemli bir siber soygunu Komiser Boz, Android NOVA-9 ve Hacker Kaito birlikte çözüyor.",
    botIds: ["demo-komiser-boz", "demo-nova-robot", "demo-kaito"],
    friendNames: [{ username: "@sen", displayName: "Sen (Kurucu)", role: "OWNER" }],
    ambientMode: true,
  },
  {
    id: "room-anime-club",
    title: "🌸 Kampüs & Anime Dostlar Kulübü",
    topic: "Tatlı Yuki, Tsundere Tıpçı Aylin ve Gamer Kız Melis ile eğlenceli, şakacı akşam buluşması.",
    botIds: ["demo-yuki", "demo-aylin-tsundere", "demo-melis-gamer"],
    friendNames: [{ username: "@sen", displayName: "Sen (Kurucu)", role: "OWNER" }],
    ambientMode: true,
  },
  {
    id: "room-dark-council",
    title: "🌙 Karanlık Konsey & Gizem Masası",
    topic: "Yeraltı patronu Baran, Gotik Cadı Lilith ve Kurt Muhafız Luna'nın gece yarısı zirvesi.",
    botIds: ["demo-baran-mafia", "demo-lilith-witch", "demo-luna"],
    friendNames: [{ username: "@sen", displayName: "Sen (Kurucu)", role: "OWNER" }],
    ambientMode: true,
  },
];

interface GroupChatViewProps {
  onExploreClick?: () => void;
  onForgeClick?: () => void;
}

export function GroupChatView({}: GroupChatViewProps = {}) {
  const [allCharacters, setAllCharacters] = useState<CharacterWithCreator[]>(FALLBACK_PERSONAS);
  const [rooms, setRooms] = useState<GroupRoom[]>(INITIAL_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>(INITIAL_ROOMS[0].id);
  const [roomMessages, setRoomMessages] = useState<Record<string, GroupRoomMessage[]>>({});
  const [inputText, setInputText] = useState("");
  const [speakingBotName, setSpeakingBotName] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(2500);

  // Modals / Drawers
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);

  // New Room Form
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomTopic, setNewRoomTopic] = useState("");
  const [newRoomSelectedBots, setNewRoomSelectedBots] = useState<string[]>([
    "demo-komiser-boz",
    "demo-yuki",
  ]);

  // Friends State
  const [friends, setFriends] = useState<FriendContact[]>(DEFAULT_FRIENDS);
  const [friendSearchInput, setFriendSearchInput] = useState("");

  // Editing Message State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved custom characters + persisted group rooms
  useEffect(() => {
    try {
      const savedChars = JSON.parse(localStorage.getItem("kael_saved_characters") || "[]");
      if (Array.isArray(savedChars) && savedChars.length > 0) {
        setAllCharacters([
          ...savedChars,
          ...FALLBACK_PERSONAS.filter((p) => !savedChars.some((s: { id: string }) => s.id === p.id)),
        ]);
      }

      const savedRooms = localStorage.getItem("kael_group_rooms");
      if (savedRooms) {
        const parsed = JSON.parse(savedRooms);
        if (Array.isArray(parsed) && parsed.length > 0) setRooms(parsed);
      }

      const savedMsgs = localStorage.getItem("kael_group_messages");
      if (savedMsgs) {
        setRoomMessages(JSON.parse(savedMsgs));
      }
    } catch {
      // ignore
    }
  }, []);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];
  const activeBots = activeRoom.botIds
    .map((id) => allCharacters.find((c) => c.id === id))
    .filter((c): c is CharacterWithCreator => !!c);

  const currentMessages: GroupRoomMessage[] = roomMessages[activeRoom.id] || [];

  // Initialize room greeting if empty
  useEffect(() => {
    if (!activeRoom) return;
    if (!roomMessages[activeRoom.id] || roomMessages[activeRoom.id].length === 0) {
      const firstBot = activeBots[0];
      if (firstBot) {
        const initial: GroupRoomMessage = {
          id: "init-" + activeRoom.id,
          role: "assistant",
          speaker_id: firstBot.id,
          speaker_name: firstBot.name,
          speaker_avatar: firstBot.avatar_url,
          content:
            firstBot.greeting_message ||
            `*Odaya göz gezdirip herkese selam verir* Selam millet! ${activeRoom.title} odasında toplandığımıza göre başlayabiliriz!`,
          created_at: new Date().toISOString(),
        };
        setRoomMessages((prev) => ({ ...prev, [activeRoom.id]: [initial] }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom.id]);

  // Save messages to localStorage
  useEffect(() => {
    if (Object.keys(roomMessages).length > 0) {
      try {
        localStorage.setItem("kael_group_messages", JSON.stringify(roomMessages));
      } catch {
        // ignore
      }
    }
  }, [roomMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, speakingBotName]);

  const updateRoomMessages = (roomId: string, msgs: GroupRoomMessage[]) => {
    setRoomMessages((prev) => ({ ...prev, [roomId]: msgs }));
  };

  // Trigger a specific bot (or auto-selected bot) to speak in the group room!
  const triggerBotTurn = async (
    historySnapshot: GroupRoomMessage[],
    targetBotId?: string | null,
    botTurnDepth = 0
  ): Promise<GroupRoomMessage | null> => {
    if (activeBots.length === 0) return null;

    const targetBot = targetBotId
      ? activeBots.find((b) => b.id === targetBotId) || activeBots[0]
      : activeBots[0];

    setSpeakingBotName(targetBotId ? targetBot.name : "Gruptaki AI");

    try {
      const res = await fetch("/api/group-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTitle: activeRoom.title,
          roomTopic: activeRoom.topic,
          roomBots: activeBots,
          history: historySnapshot.slice(-14),
          targetBotId: targetBotId || null,
          botTurnDepth,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.content) return null;

      const newBotMsg: GroupRoomMessage = {
        id: `gmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        speaker_id: data.speaker.id,
        speaker_name: data.speaker.name,
        speaker_avatar: data.speaker.avatar_url,
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setCredits((prev) => Math.max(0, prev - (data.tokensUsed ? Math.min(15, Math.ceil(data.tokensUsed / 25)) : 5)));
      return newBotMsg;
    } catch (err) {
      console.error("Group bot turn error:", err);
      return null;
    } finally {
      setSpeakingBotName(null);
    }
  };

  // 1. User sends a message in the group room
  const handleSendUserMessage = async () => {
    const text = inputText.trim();
    if (!text || speakingBotName) return;

    const userMsg: GroupRoomMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      speaker_id: "user",
      speaker_name: "Sen",
      content: text,
      created_at: new Date().toISOString(),
    };

    const nextHistory = [...currentMessages, userMsg];
    updateRoomMessages(activeRoom.id, nextHistory);
    setInputText("");

    // Primary bot responds
    const botReply = await triggerBotTurn(nextHistory, null, 0);
    if (botReply) {
      const afterFirstBot = [...nextHistory, botReply];
      updateRoomMessages(activeRoom.id, afterFirstBot);
    }
  };

  // 2. Make a specific bot speak WITHOUT the user typing anything!
  const handleMakeBotSpeak = async (botId?: string) => {
    if (speakingBotName) return;
    const reply = await triggerBotTurn(currentMessages, botId || null, 1);
    if (reply) {
      updateRoomMessages(activeRoom.id, [...currentMessages, reply]);
    }
  };

  // 3. Make two bots talk to each other automatically (2 turns with Anti-Looping limit)
  const handleBotToBotDialogue = async () => {
    if (speakingBotName || activeBots.length === 0) return;

    const lastSpeakerId = currentMessages[currentMessages.length - 1]?.speaker_id;
    const firstCandidate =
      activeBots.find((b) => b.id !== lastSpeakerId) || activeBots[0];

    const firstReply = await triggerBotTurn(currentMessages, firstCandidate.id, 1);
    if (!firstReply) return;

    const updatedAfterFirst = [...currentMessages, firstReply];
    updateRoomMessages(activeRoom.id, updatedAfterFirst);

    if (activeBots.length > 1) {
      const secondCandidate =
        activeBots.find((b) => b.id !== firstReply.speaker_id) || activeBots[0];
      const secondReply = await triggerBotTurn(updatedAfterFirst, secondCandidate.id, 2);
      if (secondReply) {
        updateRoomMessages(activeRoom.id, [...updatedAfterFirst, secondReply]);
      }
    }
  };

  // 4. Delete any message in the group room
  const handleDeleteMessage = (msgId: string) => {
    const filtered = currentMessages.filter((m) => m.id !== msgId);
    updateRoomMessages(activeRoom.id, filtered);
  };

  // 5. Delete a faulty bot message and make that exact bot regenerate its response!
  const handleRegenerateBotMessage = async (msg: GroupRoomMessage) => {
    if (speakingBotName) return;
    const idx = currentMessages.findIndex((m) => m.id === msg.id);
    if (idx === -1) return;

    const historyBefore = currentMessages.slice(0, idx);
    updateRoomMessages(activeRoom.id, historyBefore);

    const freshReply = await triggerBotTurn(historyBefore, msg.speaker_id, 1);
    if (freshReply) {
      updateRoomMessages(activeRoom.id, [...historyBefore, freshReply]);
    }
  };

  // 6. Save edited message
  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim()) return;
    const updated = currentMessages.map((m) =>
      m.id === msgId ? { ...m, content: editingText.trim(), is_edited: true } : m
    );
    updateRoomMessages(activeRoom.id, updated);
    setEditingMsgId(null);
    setEditingText("");
  };

  // Add or remove bot from active room
  const handleToggleBotInRoom = (botId: string) => {
    const exists = activeRoom.botIds.includes(botId);
    let nextBotIds = activeRoom.botIds;
    if (exists) {
      if (activeRoom.botIds.length <= 1) return; // keep at least 1 bot
      nextBotIds = activeRoom.botIds.filter((id) => id !== botId);
    } else {
      nextBotIds = [...activeRoom.botIds, botId];
    }

    const updatedRooms = rooms.map((r) =>
      r.id === activeRoom.id ? { ...r, botIds: nextBotIds } : r
    );
    setRooms(updatedRooms);
    localStorage.setItem("kael_group_rooms", JSON.stringify(updatedRooms));
  };

  // Create new group room
  const handleCreateRoom = () => {
    if (!newRoomTitle.trim() || newRoomSelectedBots.length === 0) return;
    const newRoom: GroupRoom = {
      id: `room-${Date.now()}`,
      title: newRoomTitle.trim(),
      topic: newRoomTopic.trim() || "Çoklu AI serbest grup sohbeti",
      botIds: newRoomSelectedBots,
      friendNames: [{ username: "@sen", displayName: "Sen (Kurucu)", role: "OWNER" }],
      ambientMode: true,
    };
    const updated = [newRoom, ...rooms];
    setRooms(updated);
    localStorage.setItem("kael_group_rooms", JSON.stringify(updated));
    setActiveRoomId(newRoom.id);
    setNewRoomTitle("");
    setNewRoomTopic("");
    setShowNewRoomModal(false);
  };

  // Add friend to room
  const handleInviteFriendToRoom = (friend: FriendContact) => {
    if (friend.status !== "ACCEPTED") return;
    const alreadyIn = activeRoom.friendNames.some((f) => f.username === friend.username);
    if (alreadyIn) return;

    const updatedRooms = rooms.map((r) =>
      r.id === activeRoom.id
        ? {
            ...r,
            friendNames: [
              ...r.friendNames,
              { username: friend.username, displayName: friend.displayName, role: "MEMBER" as const },
            ],
          }
        : r
    );
    setRooms(updatedRooms);
    localStorage.setItem("kael_group_rooms", JSON.stringify(updatedRooms));
  };

  // Group Room D20 Skill Check Roll
  const handleGroupD20Roll = async () => {
    if (speakingBotName) return;
    const raw = Math.floor(Math.random() * 20) + 1;
    const bonus = 3;
    const total = raw + bonus;
    const tier =
      raw === 20
        ? "🌟 DOĞAL 20 KRİTİK BAŞARI!"
        : raw === 1
        ? "💀 DOĞAL 1 KRİTİK FİYASKO!"
        : total >= 13
        ? "✅ BAŞARILI HAMLE!"
        : "⚡ RİSKLİ / KISMİ SONUÇ";

    const rollMsg: GroupRoomMessage = {
      id: `gmsg-d20-${Date.now()}`,
      role: "user",
      speaker_id: "user",
      speaker_name: "Sen (🎲 D20 Zar)",
      content: `*🎲 [Grup Odasında D20 Taktik Zarı Attı: Zar(${raw}) + Bonus(+${bonus}) = ${total} — ${tier}]* Odadaki herkesin dikkatini çekecek kritik bir hamle yapıyorum!`,
      created_at: new Date().toISOString(),
    };

    const nextHistory = [...currentMessages, rollMsg];
    updateRoomMessages(activeRoom.id, nextHistory);
    const botReply = await triggerBotTurn(nextHistory, null, 0);
    if (botReply) {
      updateRoomMessages(activeRoom.id, [...nextHistory, botReply]);
    }
    setSpeakingBotName(null);
  };

  // Co-Op Friend Companion Action in Group Room
  const handleCoOpFriendMove = async () => {
    if (speakingBotName) return;
    const invitedFriend =
      activeRoom.friendNames.find((f) => f.username !== "@sen") || {
        username: "@emre_dev",
        displayName: "Emre Yılmaz (Co-Op Dost)",
        role: "MEMBER" as const,
      };

    const coOpActions = [
      `*Odaya göz kırpıp masadaki dijital haritayı açar* "Millet, ben arka kapıdaki güvenlik kameralarını kontrol ettim! ${activeBots[0]?.name.split(" ")[0] || "Ekip"}, senin bu konudaki planın ne?"`,
      `*Sırt çantasından şifreli bir dosya çıkarıp masaya bırakır* "Hey, az önce dışarıda inanılmaz bir ipucu yakaladım. Bunu birlikte çözmeliyiz!"`,
      `*Gülümseyerek gruba döner* "Ben ortağımla aynı fikirdeyim! Şimdi sıradaki hamleyi kim yapıyor?"`,
    ];
    const picked = coOpActions[Math.floor(Math.random() * coOpActions.length)];

    const friendMsg: GroupRoomMessage = {
      id: `gmsg-coop-${Date.now()}`,
      role: "user",
      speaker_id: invitedFriend.username,
      speaker_name: `🤝 ${invitedFriend.displayName} (${invitedFriend.username})`,
      content: picked,
      created_at: new Date().toISOString(),
    };

    const nextHistory = [...currentMessages, friendMsg];
    updateRoomMessages(activeRoom.id, nextHistory);
    const botReply = await triggerBotTurn(nextHistory, null, 0);
    if (botReply) {
      updateRoomMessages(activeRoom.id, [...nextHistory, botReply]);
    }
    setSpeakingBotName(null);
  };

  // Group Autonomous World Event & Gossip
  const handleGroupWorldEvent = async () => {
    if (speakingBotName || activeBots.length === 0) return;
    const botA = activeBots[0]?.name.split(" ")[0] || "Karakter";
    const botB = activeBots[1]?.name.split(" ")[0] || "Ekip";

    const evtMsg: GroupRoomMessage = {
      id: `gmsg-world-${Date.now()}`,
      role: "user",
      speaker_id: "world-system",
      speaker_name: "🌍 Canlı Dünya Olayı",
      content: `*⚡ [ARKA PLAN DÜNYA OLAYI]: Sen odada yokken ${botA} ile ${botB} arasında gizli bir dosya yüzünden hararetli bir fısıltı döndü ve odadaki alarm ışıkları yanıp sönmeye başladı!*`,
      created_at: new Date().toISOString(),
    };

    const nextHistory = [...currentMessages, evtMsg];
    updateRoomMessages(activeRoom.id, nextHistory);
    const botReply = await triggerBotTurn(nextHistory, activeBots[0]?.id, 0);
    if (botReply) {
      updateRoomMessages(activeRoom.id, [...nextHistory, botReply]);
    }
    setSpeakingBotName(null);
  };

  const handleSendFriendRequest = () => {
    if (!friendSearchInput.trim()) return;
    const formatted = friendSearchInput.startsWith("@")
      ? friendSearchInput.trim()
      : `@${friendSearchInput.trim().toLowerCase().replace(/\s+/g, "_")}`;
    const newFriend: FriendContact = {
      id: `f-${Date.now()}`,
      username: formatted,
      displayName: friendSearchInput.replace("@", "").trim(),
      status: "ACCEPTED",
      avatar: formatted[1]?.toUpperCase() || "U",
    };
    setFriends((prev) => [newFriend, ...prev]);
    setFriendSearchInput("");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-neutral-950">
      {/* Left Sidebar: Group Rooms List */}
      <aside className="w-72 border-r border-white/10 bg-neutral-950/90 flex flex-col shrink-0 hidden md:flex">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="size-4 text-purple-400" />
              Grup Odaları
            </h2>
            <p className="text-[11px] text-neutral-400">Çoklu AI & Arkadaş Odaları</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewRoomModal(true)}
            className="h-8 px-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl"
          >
            <Plus className="size-3.5 mr-1" /> Oda Kur
          </Button>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rooms.map((room) => {
            const isSel = room.id === activeRoom.id;
            const roomBotAvatars = room.botIds
              .map((id) => allCharacters.find((c) => c.id === id))
              .filter(Boolean);

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSel
                    ? "bg-purple-950/40 border-purple-500/50 shadow-lg"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                }`}
              >
                <div className="font-bold text-xs text-white line-clamp-1">{room.title}</div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">{room.topic}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex -space-x-2 overflow-hidden">
                    {roomBotAvatars.slice(0, 4).map((b) => (
                      <Avatar key={b!.id} className="size-6 border border-neutral-900">
                        <AvatarImage src={b!.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-purple-900">
                          {b!.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-purple-500/30 text-purple-300"
                  >
                    {room.botIds.length} AI Bot
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Credit & Friends Bar */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-neutral-900/40">
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Coins className="size-3.5 text-amber-400" /> Kredi Bakiyesi:
            </span>
            <span className="font-mono font-bold">{credits} Token</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSocialModal(true)}
            className="w-full h-8 text-xs border-white/10 bg-white/[0.03] hover:bg-white/10 text-neutral-200 rounded-xl"
          >
            <UserPlus className="size-3.5 mr-1.5 text-purple-400" />
            Arkadaşlar & Üye Yönetimi ({friends.filter((f) => f.status === "ACCEPTED").length})
          </Button>
        </div>
      </aside>

      {/* Main Group Room Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Room Header */}
        <header className="h-16 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {activeRoom.title}
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] hidden sm:inline-flex">
                Anti-Loop Koruması Aktif
              </Badge>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">{activeRoom.topic}</p>
          </div>

          {/* Active Bots in Room & Add Bot Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center -space-x-2 mr-1">
              {activeBots.map((bot) => (
                <Avatar
                  key={bot.id}
                  className="size-8 border-2 border-neutral-950 shadow"
                  title={bot.name}
                >
                  <AvatarImage src={bot.avatar_url || undefined} />
                  <AvatarFallback className="bg-purple-900 text-xs">{bot.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => setShowAddBotModal(true)}
              className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl"
            >
              <Bot className="size-3.5 mr-1.5" />
              AI Bot Ekle / Çıkar ({activeBots.length})
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewRoomModal(true)}
              className="h-8 px-2.5 border-white/10 bg-white/[0.04] text-white text-xs rounded-xl md:hidden"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 space-y-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {currentMessages.map((msg) => {
              const isUser = msg.role === "user";
              const isEditing = editingMsgId === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="size-10 shrink-0 border border-white/15 shadow-md">
                    {!isUser && <AvatarImage src={msg.speaker_avatar || undefined} className="object-cover" />}
                    <AvatarFallback
                      className={
                        isUser
                          ? "bg-purple-700 text-white font-bold text-xs"
                          : "bg-neutral-800 text-purple-300 font-bold text-xs"
                      }
                    >
                      {msg.speaker_name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      <span className="font-bold text-white">{msg.speaker_name}</span>
                      {!isUser && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-purple-500/30 bg-purple-500/10 text-purple-300"
                        >
                          AI Bot
                        </Badge>
                      )}
                      {msg.is_edited && (
                        <span className="text-[10px] text-neutral-500 italic">(düzenlendi)</span>
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                        isUser
                          ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-none"
                          : "bg-neutral-900/90 border border-white/10 text-neutral-100 rounded-tl-none"
                      }`}
                    >
                      {isEditing ? (
                        <div className="min-w-[260px] sm:min-w-[360px] space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            className="bg-black/60 border-white/20 text-xs text-white"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMsgId(null)}
                              className="h-7 text-xs text-neutral-400"
                            >
                              İptal
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="h-7 text-xs bg-purple-600 text-white"
                            >
                              Kaydet
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-line">{msg.content}</p>
                      )}
                    </div>

                    {/* Action Buttons under Every Message: Regenerate, Make This Bot Speak Again, Edit, Delete */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {!isUser && (
                        <>
                          <button
                            type="button"
                            disabled={!!speakingBotName}
                            onClick={() => handleRegenerateBotMessage(msg)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-purple-500/20 border border-white/10 text-neutral-300 hover:text-purple-200 transition cursor-pointer disabled:opacity-40"
                            title="Bu botun mesajını silip yeniden üret"
                          >
                            <RotateCw className="size-3" />
                            <span>Sil & Yeniden Yazdır</span>
                          </button>

                          <button
                            type="button"
                            disabled={!!speakingBotName}
                            onClick={() => handleMakeBotSpeak(msg.speaker_id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 transition cursor-pointer disabled:opacity-40"
                            title="Sen yazmadan bu bot tekrar konuşsun"
                          >
                            <Play className="size-3 fill-current" />
                            <span>{msg.speaker_name.split(" ")[0]} Tekrar Konuşsun</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingMsgId(msg.id);
                          setEditingText(msg.content);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-white/10 border border-white/5 text-neutral-400 hover:text-white transition cursor-pointer"
                      >
                        <Edit2 className="size-3" />
                        <span>Düzenle</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] hover:bg-red-500/20 border border-white/5 text-neutral-400 hover:text-red-300 transition cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                        <span>Sil</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {speakingBotName && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-purple-300">
                <Sparkles className="size-4 text-purple-400 animate-spin" />
                <span className="font-mono">{speakingBotName} düşünüyor ve gruba yazıyor...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* HANDS-FREE BOT TRIGGER BAR: Sen Bir Şey Yazmadan İstediğin Bot veya Botlar Konuşsun! */}
        <div className="border-t border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-2.5">
          <div className="max-w-4xl mx-auto space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-purple-300 mr-1 flex items-center gap-1">
                <Play className="size-3 fill-current" />
                Sen Yazmadan Konuştur:
              </span>

              {activeBots.map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  disabled={!!speakingBotName}
                  onClick={() => handleMakeBotSpeak(bot.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-100 text-xs font-medium transition cursor-pointer disabled:opacity-40"
                >
                  <Avatar className="size-4">
                    <AvatarImage src={bot.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px]">{bot.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>🗣️ {bot.name.split(" ")[0]} Konuşsun</span>
                </button>
              ))}

              {activeBots.length > 1 && (
                <button
                  type="button"
                  disabled={!!speakingBotName}
                  onClick={handleBotToBotDialogue}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-pink-600/30 to-amber-600/30 hover:from-pink-600/50 hover:to-amber-600/50 border border-pink-500/40 text-pink-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                  title="Botlar kendi aralarında 2 tur karşılıklı sohbet etsin"
                >
                  <Flame className="size-3.5 text-amber-400" />
                  <span>Botlar Arası Diyalog (2 Tur)</span>
                </button>
              )}

              {/* NEW: Group Room D20 Skill Check Button */}
              <button
                type="button"
                disabled={!!speakingBotName}
                onClick={handleGroupD20Roll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                title="Grup odasında D20 RPG Zarı at ve botların tepkisini gör"
              >
                <span>🎲 D20 Zar At</span>
              </button>

              {/* NEW: Co-Op Friend Move Trigger */}
              <button
                type="button"
                disabled={!!speakingBotName}
                onClick={handleCoOpFriendMove}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                title="Odadaki Co-Op arkadaşın da hikayeye ortak olup hamle yapsın"
              >
                <span>🤝 Co-Op Arkadaş Hamlesi</span>
              </button>

              {/* NEW: Group World Event / Gossip Trigger */}
              <button
                type="button"
                disabled={!!speakingBotName}
                onClick={handleGroupWorldEvent}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/40 text-teal-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                title="Gruptaki botlar arasında sürpriz bir dünya olayı / dedikodu tetikle"
              >
                <span>🌍 Dünya Olayı</span>
              </button>
            </div>

            {/* Group Message Input */}
            <div className="flex items-center gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Gruba mesaj yaz veya @${activeBots[0]?.name.split(" ")[0] || "Bot"} ile etiketle...`}
                className="bg-neutral-950 border-white/15 text-sm text-white rounded-xl h-10 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendUserMessage();
                }}
              />
              <Button
                onClick={handleSendUserMessage}
                disabled={!inputText.trim() || !!speakingBotName}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl h-10 px-5"
              >
                <Send className="size-4 mr-1.5" />
                Gönder
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Add / Remove AI Bots in Group Room */}
      <AnimatePresence>
        {showAddBotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Gruba AI Karakter Ekle / Çıkar
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Hem Keşfet karakterlerini hem de kendi oluşturduğun karakterleri aynı odaya ekleyebilirsin!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBotModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
                {allCharacters.map((char) => {
                  const inRoom = activeRoom.botIds.includes(char.id);
                  return (
                    <div
                      key={char.id}
                      onClick={() => handleToggleBotInRoom(char.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        inRoom
                          ? "bg-purple-950/40 border-purple-500/50 text-white"
                          : "bg-white/[0.02] border-white/10 text-neutral-300 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-10 border border-white/15 shrink-0">
                          <AvatarImage src={char.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback>{char.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{char.name}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{char.tagline}</p>
                        </div>
                      </div>
                      <Badge
                        className={
                          inRoom
                            ? "bg-emerald-600 text-white text-[10px] shrink-0"
                            : "bg-white/10 text-neutral-300 text-[10px] shrink-0"
                        }
                      >
                        {inRoom ? "✓ Odada" : "+ Ekle"}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <Button
                  onClick={() => setShowAddBotModal(false)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl"
                >
                  Tamamla
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create New Group Room */}
      <AnimatePresence>
        {showNewRoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquarePlus className="size-4 text-purple-400" />
                  Yeni Çoklu-AI Grup Odası Kur
                </h3>
                <button
                  onClick={() => setShowNewRoomModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Grup Odası Adı
                  </label>
                  <Input
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="Örn: 🐻 Emniyet & Sokak Yarışçıları Yüzleşmesi"
                    className="bg-neutral-950 border-white/15 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Oda Konusu / Senaryo
                  </label>
                  <Textarea
                    value={newRoomTopic}
                    onChange={(e) => setNewRoomTopic(e.target.value)}
                    placeholder="Örn: Komiser Boz gece otobanında Zeynep ve Baran'ı sorguya çekiyor..."
                    rows={2}
                    className="bg-neutral-950 border-white/15 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1.5">
                    Odaya Katılacak AI Botları Seç ({newRoomSelectedBots.length} seçildi)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {allCharacters.map((c) => {
                      const sel = newRoomSelectedBots.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setNewRoomSelectedBots((prev) =>
                              sel ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                            )
                          }
                          className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                            sel
                              ? "bg-purple-600/30 border-purple-400 text-white"
                              : "bg-white/[0.02] border-white/10 text-neutral-400"
                          }`}
                        >
                          <Avatar className="size-6">
                            <AvatarImage src={c.avatar_url || undefined} />
                            <AvatarFallback>{c.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{c.name.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowNewRoomModal(false)}
                  className="text-xs text-neutral-400"
                >
                  Vazgeç
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!newRoomTitle.trim() || newRoomSelectedBots.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-xl"
                >
                  Grubu Oluştur ve Başla
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Social Network & Friends Management */}
      <AnimatePresence>
        {showSocialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-neutral-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="size-4 text-purple-400" />
                    Sosyal Ağ, Arkadaşlar & Grup Yetkileri
                  </h3>
                  <p className="text-xs text-neutral-400">
                    @username ile arkadaş ekle ve onaylı arkadaşlarını aktif grup odasına davet et
                  </p>
                </div>
                <button
                  onClick={() => setShowSocialModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <Input
                  value={friendSearchInput}
                  onChange={(e) => setFriendSearchInput(e.target.value)}
                  placeholder="@kullanici_adi ile arkadaş ekle..."
                  className="bg-neutral-950 border-white/15 text-xs text-white"
                />
                <Button
                  onClick={handleSendFriendRequest}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl shrink-0"
                >
                  İstek Gönder
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((f) => {
                  const inRoom = activeRoom.friendNames.some((fn) => fn.username === f.username);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-purple-800 flex items-center justify-center font-bold text-white">
                          {f.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-white">{f.displayName}</p>
                          <p className="text-[10px] text-neutral-400">{f.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {f.status === "PENDING" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              setFriends((prev) =>
                                prev.map((x) =>
                                  x.id === f.id ? { ...x, status: "ACCEPTED" } : x
                                )
                              )
                            }
                            className="h-7 px-2.5 bg-emerald-600 text-white text-[11px] rounded-lg"
                          >
                            <Check className="size-3 mr-1" /> Kabul Et
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={inRoom}
                            onClick={() => handleInviteFriendToRoom(f)}
                            className="h-7 px-2.5 bg-purple-600/30 border border-purple-500/40 text-purple-200 text-[11px] rounded-lg"
                          >
                            {inRoom ? "✓ Odada (MEMBER)" : "+ Odaya Ekle"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
