// ============================================================
// KAEL-AI: D20 Skill Check, Loot, Mind-Map & Autonomous World Engine
// ============================================================

import type { RpgHudState } from "@/lib/rpg/rpg-engine";

export type SkillStatKey = "STR" | "DEX" | "INT" | "CHA" | "ARC" | "LCK";

export interface SkillDefinition {
  key: SkillStatKey;
  label: string;
  emoji: string;
  bonus: number;
  description: string;
  exampleAction: string;
}

export const RPG_SKILLS: SkillDefinition[] = [
  {
    key: "STR",
    label: "Güç & Gözdağı",
    emoji: "💪",
    bonus: 2,
    description: "Kapı kırma, fiziksel mücadele, baskı kurma",
    exampleAction: "Demir kapıyı omuzlayıp kırmayı deniyorum",
  },
  {
    key: "DEX",
    label: "Çeviklik & Gizlilik",
    emoji: "🗡️",
    bonus: 3,
    description: "Sessizce sızma, kilit açma, ani refleks",
    exampleAction: "Gölgelerin arasından fark edilmeden kasaya sızıyorum",
  },
  {
    key: "INT",
    label: "Dedektiflik & Analiz",
    emoji: "🕵️‍♂️",
    bonus: 4,
    description: "Kanıt inceleme, yalan yakalama, şifre çözme",
    exampleAction: "Masadaki gizli dosyadaki çelişkileri ve parmak izlerini inceliyorum",
  },
  {
    key: "CHA",
    label: "İkna & Karizma",
    emoji: "💬",
    bonus: 3,
    description: "Tatlı dil, pazarlık, kalbini kazanma, blöf",
    exampleAction: "Gözlerinin içine bakıp bana güvenmesi için samimiyetle ikna ediyorum",
  },
  {
    key: "ARC",
    label: "Sezgi & Gizem",
    emoji: "🔮",
    bonus: 2,
    description: "Tehlikeyi sezme, kadim sırları ve aurayı okuma",
    exampleAction: "Odadaki gizli enerjiyi ve saklanan niyeti sezmeye çalışıyorum",
  },
  {
    key: "LCK",
    label: "Saf Şans",
    emoji: "🍀",
    bonus: 1,
    description: "Kritik anlarda mucizevi rastlantılar",
    exampleAction: "Tamamen şansıma güvenerek doğru kabloyu çekiyorum",
  },
];

export type DiceOutcomeTier =
  | "CRITICAL_SUCCESS"
  | "SUCCESS"
  | "PARTIAL"
  | "FAILURE"
  | "CRITICAL_FAIL";

export interface D20RollResult {
  id: string;
  skill: SkillDefinition;
  actionText: string;
  rawRoll: number; // 1 - 20
  modifier: number;
  total: number;
  difficultyClass: number; // DC (default 12)
  tier: DiceOutcomeTier;
  tierLabel: string;
  tierColor: string;
  narrativeInjection: string;
  lootReward?: { name: string; icon: string; qty: number };
  goldDelta: number;
  hpDelta: number;
}

const LOOT_POOL: { name: string; icon: string }[] = [
  { name: "Şifreli Mikroçip", icon: "💾" },
  { name: "Komiserin Özel Rozeti", icon: "🪪" },
  { name: "Kadim Gümüş Anahtar", icon: "🗝️" },
  { name: "Gece Görüş Lensi", icon: "🥽" },
  { name: "Kızıl Kuvars Tılsımı", icon: "🔮" },
  { name: "Gizli İstihbarat Zarfı", icon: "✉️" },
  { name: "El Yapımı Kestane Balı", icon: "🍯" },
  { name: "Can İksiri (Tam Yenileme)", icon: "🧪" },
];

export function rollD20SkillCheck(
  skillKey: SkillStatKey,
  customActionText?: string,
  difficultyClass = 12
): D20RollResult {
  const skill = RPG_SKILLS.find((s) => s.key === skillKey) || RPG_SKILLS[2];
  const rawRoll = Math.floor(Math.random() * 20) + 1;
  const modifier = skill.bonus;
  const total = rawRoll + modifier;
  const action = (customActionText || skill.exampleAction).trim();

  let tier: DiceOutcomeTier;
  let tierLabel: string;
  let tierColor: string;
  let lootReward: { name: string; icon: string; qty: number } | undefined;
  let goldDelta = 0;
  let hpDelta = 0;

  if (rawRoll === 20) {
    tier = "CRITICAL_SUCCESS";
    tierLabel = "🌟 DOĞAL 20! KRİTİK BAŞARI!";
    tierColor = "text-amber-300 border-amber-400/60 bg-amber-500/20";
    const pick = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
    lootReward = { ...pick, qty: 1 };
    goldDelta = 30;
  } else if (rawRoll === 1) {
    tier = "CRITICAL_FAIL";
    tierLabel = "💀 DOĞAL 1! KRİTİK FİYASKO!";
    tierColor = "text-red-300 border-red-500/60 bg-red-500/20";
    hpDelta = -10;
  } else if (total >= difficultyClass + 3) {
    tier = "SUCCESS";
    tierLabel = "✅ TAM BAŞARI!";
    tierColor = "text-emerald-300 border-emerald-500/50 bg-emerald-500/15";
    goldDelta = 10;
  } else if (total >= difficultyClass - 2) {
    tier = "PARTIAL";
    tierLabel = "⚡ KISMİ BAŞARI (Ucu Ucuna / Riskli)";
    tierColor = "text-cyan-300 border-cyan-500/50 bg-cyan-500/15";
  } else {
    tier = "FAILURE";
    tierLabel = "❌ BAŞARISIZ HAMLE";
    tierColor = "text-rose-300 border-rose-500/40 bg-rose-500/15";
    hpDelta = -5;
  }

  const lootNote = lootReward
    ? ` (Ayrıca envantere yeni ganimet/ipucu eklendi: ${lootReward.icon} ${lootReward.name}!)`
    : "";

  const narrativeInjection = `*🎲 [D20 ${skill.emoji} ${skill.label} Zarı Attı: Zar(${rawRoll}) + Bonus(+${modifier}) = ${total} vs Zorluk(${difficultyClass}) — ${tierLabel}]* ${action}${lootNote}`;

  return {
    id: `d20-${Date.now()}`,
    skill,
    actionText: action,
    rawRoll,
    modifier,
    total,
    difficultyClass,
    tier,
    tierLabel,
    tierColor,
    narrativeInjection,
    lootReward,
    goldDelta,
    hpDelta,
  };
}

export function applyRollToHudState(hud: RpgHudState, roll: D20RollResult): RpgHudState {
  const nextHp = Math.max(1, Math.min(hud.maxHp, hud.hp + roll.hpDelta));
  const nextGold = Math.max(0, hud.gold + roll.goldDelta);
  const nextInv = [...hud.inventory];

  if (roll.lootReward) {
    const existing = nextInv.find((item) => item.name === roll.lootReward!.name);
    if (existing) {
      existing.qty += roll.lootReward.qty;
    } else {
      nextInv.push({ ...roll.lootReward });
    }
  }

  return {
    ...hud,
    hp: nextHp,
    gold: nextGold,
    inventory: nextInv,
  };
}

// ============================================================
// AUTONOMOUS WORLD EVENTS & GOSSIP ENGINE
// ============================================================
export interface AutonomousWorldEvent {
  id: string;
  title: string;
  summary: string;
  category: "gossip" | "mystery" | "romance" | "conflict";
  timestamp: string;
  promptHook: string;
  affectionImpact: number;
}

export function generateAutonomousWorldEvent(
  characterName: string,
  location: string,
  affectionScore: number
): AutonomousWorldEvent {
  const firstName = characterName.split(" ")[0];
  const templates: Omit<AutonomousWorldEvent, "id" | "timestamp">[] = [
    {
      title: `🕵️‍♂️ ${firstName} Gizli Bir Dosya Ele Geçirdi`,
      summary: `Sen yokken ${characterName}, ${location} yakınlarında şifreli bir ses kaydı ve senin adının geçtiği mühürlü bir zarf buldu.`,
      category: "mystery",
      promptHook: `*Odaya döndüğümde elindeki mühürlü zarfı ve ses kayıt cihazını fark ederim* "${firstName}, ben yokken ${location} tarafında ne buldun? O zarfta neden benim adım yazıyor?"`,
      affectionImpact: 2,
    },
    {
      title: `💬 Karakterler Arası Fısıltı & Dedikodu`,
      summary: `Diğer karakterler arasında ${firstName}'in seni herkesten ayrı tuttuğu ve senin için gizli bir plan hazırladığı konuşuluyor.`,
      category: "gossip",
      promptHook: `*Hafifçe gülümseyerek yanına yaklaşırım* "${firstName}, etrafta senin hakkında bazı dedikodular duydum... Ben yokken benim için gizli bir şey mi planlıyordun?"`,
      affectionImpact: 3,
    },
    {
      title: `⚡ ${location} Bölgesinde Beklenmedik Alarm!`,
      summary: `Kısa süre önce ${location} çevresinde şüpheli bir gölge fark edildi. ${firstName} tetikte bekleyip senin dönmeni gözledi.`,
      category: "conflict",
      promptHook: `*Hızlı adımlarla yanına gelip etrafı kolaçan ederim* "${firstName}, iyi misin? Az önce ${location} civarında bir hareketlilik olduğunu duydum, neler oldu?"`,
      affectionImpact: 2,
    },
    {
      title: `🌙 ${firstName}'in Kişisel Günlük Notu`,
      summary:
        affectionScore >= 50
          ? `${firstName} masasının üzerinde yanlışlıkla sana hitaben yazdığı samimi bir not bıraktı.`
          : `${firstName} senin gerçek niyetini çözmek için geçmişteki konuşmalarınızı tek tek not aldı.`,
      category: "romance",
      promptHook: `*Masanın kenarında duran el yazısı notu görüp gözlerine bakarım* "${firstName}... Masanın üzerindeki bu notu ben yokken mi yazdın?"`,
      affectionImpact: 4,
    },
  ];

  const picked = templates[Math.floor(Math.random() * templates.length)];
  return {
    ...picked,
    id: `world-evt-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };
}
