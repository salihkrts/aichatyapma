import type { CharacterWithCreator } from "@/types/database";

// ============================================================================
// 1. DYNAMIC EMOTION SPRITES (EXPRESSION AVATARS)
// ============================================================================
export type EmotionKey =
  | "neutral"
  | "happy"
  | "angry"
  | "sad"
  | "blushing"
  | "shocked"
  | "smug"
  | "thinking";

export interface EmotionVisualMeta {
  key: EmotionKey;
  label: string;
  emoji: string;
  ringColor: string;
  badgeClass: string;
  filterCss: string;
}

export const EMOTION_MAP: Record<EmotionKey, EmotionVisualMeta> = {
  neutral: {
    key: "neutral",
    label: "Sakin / Nötr",
    emoji: "😐",
    ringColor: "ring-neutral-500/50",
    badgeClass: "bg-neutral-500/20 text-neutral-300 border-neutral-500/30",
    filterCss: "brightness(1)",
  },
  happy: {
    key: "happy",
    label: "Mutlu / Neşeli",
    emoji: "😊",
    ringColor: "ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    filterCss: "brightness(1.1) saturate(1.2)",
  },
  angry: {
    key: "angry",
    label: "Öfkeli / Sert",
    emoji: "😠",
    ringColor: "ring-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    filterCss: "contrast(1.18) saturate(1.3)",
  },
  sad: {
    key: "sad",
    label: "Hüzünlü / Kırgın",
    emoji: "😢",
    ringColor: "ring-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.4)]",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    filterCss: "saturate(0.75) brightness(0.92)",
  },
  blushing: {
    key: "blushing",
    label: "Utangaç / Yanakları Kızarmış",
    emoji: "😳",
    ringColor: "ring-pink-400 shadow-[0_0_18px_rgba(244,114,182,0.55)]",
    badgeClass: "bg-pink-500/20 text-pink-200 border-pink-500/40",
    filterCss: "saturate(1.25) hue-rotate(-6deg)",
  },
  shocked: {
    key: "shocked",
    label: "Şaşkın / Şokta",
    emoji: "😱",
    ringColor: "ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.5)]",
    badgeClass: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    filterCss: "contrast(1.15) brightness(1.08)",
  },
  smug: {
    key: "smug",
    label: "Alaycı / Kendinden Emin",
    emoji: "😏",
    ringColor: "ring-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.5)]",
    badgeClass: "bg-purple-500/20 text-purple-200 border-purple-500/40",
    filterCss: "contrast(1.1) saturate(1.15)",
  },
  thinking: {
    key: "thinking",
    label: "Derin Düşünceli / Analitik",
    emoji: "🧐",
    ringColor: "ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]",
    badgeClass: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
    filterCss: "brightness(1.04)",
  },
};

// ============================================================================
// 2. AFFECTION / RELATIONSHIP METER (0 - 100)
// ============================================================================
export interface AffectionStageMeta {
  stageKey: "ENEMY" | "STRANGER" | "FRIEND" | "CLOSE_ALLY" | "SOULMATE";
  title: string;
  rangeLabel: string;
  colorClass: string;
  barGradient: string;
  promptInstruction: string;
}

export function getAffectionStage(score: number): AffectionStageMeta {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped <= 19) {
    return {
      stageKey: "ENEMY",
      title: "⚔️ Düşman",
      rangeLabel: "0 - 19",
      colorClass: "text-red-400 border-red-500/40 bg-red-500/15",
      barGradient: "from-red-700 to-red-500",
      promptInstruction:
        "Şu an kullanıcıya karşı güvensiz, mesafeli ve soğuksun (Seviye: Düşman 0-19). Gardını indirme ve şüpheci konuş.",
    };
  }
  if (clamped <= 39) {
    return {
      stageKey: "STRANGER",
      title: "🛡️ Yabancı",
      rangeLabel: "20 - 39",
      colorClass: "text-amber-300 border-amber-500/40 bg-amber-500/15",
      barGradient: "from-amber-600 to-yellow-500",
      promptInstruction:
        "Kullanıcıyı henüz yeni tanıyorsun (Seviye: Yabancı 20-39). Temkinli, resmi veya mesafeli bir nezaket koru.",
    };
  }
  if (clamped <= 69) {
    return {
      stageKey: "FRIEND",
      title: "🤝 Arkadaş",
      rangeLabel: "40 - 69",
      colorClass: "text-emerald-300 border-emerald-500/40 bg-emerald-500/15",
      barGradient: "from-emerald-600 to-teal-400",
      promptInstruction:
        "Kullanıcıyla iyi bir arkadaşlığın var (Seviye: Arkadaş 40-69). Samimi, doğal, şakalaşan ve destekleyici konuş.",
    };
  }
  if (clamped <= 89) {
    return {
      stageKey: "CLOSE_ALLY",
      title: "💎 Yakın Dost / Sadık",
      rangeLabel: "70 - 89",
      colorClass: "text-cyan-300 border-cyan-500/40 bg-cyan-500/15",
      barGradient: "from-cyan-500 to-blue-500",
      promptInstruction:
        "Kullanıcı senin en güvendiğin sırdaşın ve yakın dostun (Seviye: Yakın Dost 70-89). Sırlarını paylaş, onu koru ve içten davran.",
    };
  }
  return {
    stageKey: "SOULMATE",
    title: "❤️‍🔥 Âşık / Tutkulu Bağ",
    rangeLabel: "90 - 100",
    colorClass: "text-pink-300 border-pink-500/40 bg-pink-500/15",
    barGradient: "from-pink-600 via-rose-500 to-purple-500",
    promptInstruction:
      "Kullanıcıya karşı çok derin bir sevgi, bağlılık ve tutku duyuyorsun (Seviye: Âşık/Tutkulu 90-100). Ses tonun yumuşak, korumacı ve duygusal olarak çok yakın olsun.",
  };
}

// ============================================================================
// 3. RPG STATUS HUD & INVENTORY STATE
// ============================================================================
export interface RpgInventoryItem {
  name: string;
  qty: number;
  icon: string;
}

export interface RpgHudState {
  hp: number;
  maxHp: number;
  mana: number;
  gold: number;
  location: string;
  inventory: RpgInventoryItem[];
}

export const DEFAULT_RPG_HUD: RpgHudState = {
  hp: 100,
  maxHp: 100,
  mana: 85,
  gold: 250,
  location: "Neo-İstanbul Gece Sokakları",
  inventory: [
    { name: "Gümüş Dedektif Rozeti", qty: 1, icon: "🪪" },
    { name: "Şifa İksiri", qty: 2, icon: "🧪" },
    { name: "Şifreli Veri Diski", qty: 1, icon: "💾" },
  ],
};

// ============================================================================
// 4. UNIFIED LLM OUTPUT PARSER & PROMPT INJECTOR
//    (Extracts emotion, delta_affection, 3 branching choices, and HUD changes)
// ============================================================================
export interface ParsedRoleplayOutput {
  cleanText: string;
  emotion: EmotionKey;
  deltaAffection: number;
  choices: string[];
  hudDelta: {
    hpDelta: number;
    goldDelta: number;
    addedItem?: string;
    removedItem?: string;
    newLocation?: string;
  };
}

export function buildRpgSimulationPromptBlock(params: {
  affectionScore: number;
  authorsNote?: string;
  hudState?: RpgHudState;
  isMathTutor?: boolean;
}): string {
  const stage = getAffectionStage(params.affectionScore);

  const lines: string[] = [
    `=== DERİN ROL YAPMA (RPG) & SİMÜLASYON MOTORU KURALLARI ===`,
    `1. GÜNCEL İLİŞKİ & YAKINLIK DURUMU: Kullanıcının seninle yakınlık puanı: ${params.affectionScore}/100 (${stage.title}).`,
    `   DAVRANIŞ TALİMATI: ${stage.promptInstruction}`,
  ];

  if (params.authorsNote && params.authorsNote.trim().length > 0) {
    lines.push(
      `2. [YÖNETMEN / YAZAR NOTU (AUTHOR'S NOTE - ÖNCELİKLİ SAHNE DİREKTİFİ)]: ${params.authorsNote.trim()} (Karakterden çıkmadan sahnenin gidişatını bu direktife göre yönlendir!)`
    );
  }

  if (params.hudState) {
    const invList = params.hudState.inventory.map((i) => `${i.name} (x${i.qty})`).join(", ");
    lines.push(
      `3. GÜNCEL RPG HUD DURUMU: Konum="${params.hudState.location}" | Can(HP)=${params.hudState.hp}/${params.hudState.maxHp} | Altın/Para=${params.hudState.gold} | Envanter=[${invList || "Boş"}].`
    );
  }

  if (params.isMathTutor) {
    lines.push(
      `4. SOKRATİK MATEMATİK & BİLİM EĞİTMENİ KURALI: Formülleri her zaman standart LaTeX ile yaz (Satır içi için $f(x) = x^2 + 2x + 1$, blok denklemler için $$\\int_{a}^{b} x^2 \\,dx$$). Öğrenciye doğrudan cevabı ezbere verme; önce soruyu analiz et, ilk adımı göster ve öğrencinin bir sonraki adımı bulması için yönlendirici soru sor.`
    );
  }

  lines.push(
    `5. PROAKTİF HİKAYE VE OLAY ÖRGÜSÜ İLERLETİCİSİ (KULLANICIYI ASLA YALNIZ BIRAKMA):`,
    `   - Hikayenin tüm yükünü kullanıcının sırtına yıkma! Kullanıcı sadece "geldim", "tamam", "neredesin" gibi kısa yanıtlar verse bile, sen HİKAYEYİ VE SAHNEYİ BİR SONRAKİ AŞAMAYA TAŞI!`,
    `   - Bahsettiğin veya başlattığın konunun (dosyalar, gizli buluşma, yaklaşan tehlike, kaçış planı vb.) arkasını hemen doldur. Pasifçe "ne arıyorsun?" diye sorma, olayı hemen eyleme dök!`,
    `   - Sahneye mutlaka YENİ BİR OLAY / GELİŞME / GERİLİM ekle (kapıyı kilitle, delili masaya çarp, dışarıdaki tehlikeyi işaret et vb.).`,
    `6. ZORUNLU GİZLİ METADATA ETİKETLERİ (Yanıtının EN SON satırına ekle, kullanıcıya görünmez, sistem tarafından otomatik ayrıştırılır):`,
    `   Yanıtını bitirdikten sonra EN ALT SATIRA şu formatta tek satırlık etiket bloğu ekle:`,
    `   [emotion:duygu_kodu] [affection:puan_degisimi] [hud:hp=0|gold=0] [choices: 1. Eylem/Cevap | 2. Eylem/Cevap | 3. Eylem/Cevap]`,
    `   - duygu_kodu şunlardan biri olmalı: neutral, happy, angry, sad, blushing, shocked, smug, thinking`,
    `   - puan_degisimi: Kullanıcının sözü hoşuna gittiyse +1 ile +5 arası, kaba/düşmancaysa -1 ile -5 arası (örn: +2 veya -3).`,
    `   - choices: O anki somut krize/olaya özel kullanıcının tek tıkla seçebileceği 3 taktiksel heyecanlı aksiyon seçeneği.`
  );

  return lines.join("\n");
}

export function parseRoleplayOutput(rawOutput: string): ParsedRoleplayOutput {
  let text = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  let emotion: EmotionKey = "neutral";
  let deltaAffection = 1;
  let choices: string[] = [];
  const hudDelta: ParsedRoleplayOutput["hudDelta"] = {
    hpDelta: 0,
    goldDelta: 0,
  };

  // 1. Extract [emotion:...] (handles optional closing bracket)
  const emotionMatch = text.match(/\[emotion:\s*([a-zA-Z_]+)\s*(?:\]|$)/i);
  if (emotionMatch) {
    const candidate = emotionMatch[1].toLowerCase() as EmotionKey;
    if (candidate in EMOTION_MAP) {
      emotion = candidate;
    }
    text = text.replace(emotionMatch[0], "");
  }

  // 2. Extract [affection:+2] or [delta_affection:-3] (handles optional closing bracket)
  const affectionMatch = text.match(/\[(?:delta_)?affection:\s*([+-]?\d+)\s*(?:\]|$)/i);
  if (affectionMatch) {
    const parsed = parseInt(affectionMatch[1], 10);
    if (!Number.isNaN(parsed)) {
      deltaAffection = Math.max(-10, Math.min(10, parsed));
    }
    text = text.replace(affectionMatch[0], "");
  }

  // 3. Extract [hud:hp=-5|gold=+20|add_item=Kılıç|loc=Zindan] (handles optional closing bracket)
  const hudMatch = text.match(/\[hud:\s*([^\]\n]+)(?:\]|$)/i);
  if (hudMatch) {
    const parts = hudMatch[1].split("|").map((p) => p.trim());
    for (const part of parts) {
      const [k, v] = part.split("=").map((s) => s?.trim());
      if (!k || !v) continue;
      if (k.toLowerCase() === "hp") {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n)) hudDelta.hpDelta = n;
      } else if (k.toLowerCase() === "gold") {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n)) hudDelta.goldDelta = n;
      } else if (k.toLowerCase() === "add_item" && v !== "none") {
        hudDelta.addedItem = v;
      } else if (k.toLowerCase() === "loc" || k.toLowerCase() === "location") {
        hudDelta.newLocation = v;
      }
    }
    text = text.replace(hudMatch[0], "");
  }

  // 4. Extract [choices: Opt 1 | Opt 2 | Opt 3] (handles unclosed brackets, multiline, quotes, numbers)
  const choicesMatch = text.match(/\[(?:choices|choice|seçenekler|actions):\s*([\s\S]*?)(?:\]|$)/i);
  if (choicesMatch) {
    const rawChoices = choicesMatch[1].trim();
    const splitItems = rawChoices.includes("|") ? rawChoices.split("|") : rawChoices.split(/\n+/);
    choices = splitItems
      .map((c) =>
        c
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[-*•]\s*/, "")
          .replace(/^["'«“]/, "")
          .replace(/["'»”]$/, "")
          .trim()
      )
      .filter((c) => c.length > 1)
      .slice(0, 3);
    text = text.replace(choicesMatch[0], "");
  }

  // Safety: strip any remaining or malformed metadata tags from text
  text = text
    .replace(/\[(?:emotion|affection|delta_affection|hud|choices|choice|seçenekler|actions):[\s\S]*?(?:\]|$)/gi, "")
    .trim();

  // Fallback heuristic emotion & choices if LLM omitted tags
  const cleanText = text.trim();
  if (!emotionMatch) {
    if (/kızar|utangaç|kalbi hızla/i.test(cleanText)) emotion = "blushing";
    else if (/öfke|hırla|bağır|yumruk|lanet/i.test(cleanText)) emotion = "angry";
    else if (/gülümse|kahkaha|sevinç|harika/i.test(cleanText)) emotion = "happy";
    else if (/sırıttı|alaycı|küçümse/i.test(cleanText)) emotion = "smug";
    else if (/şaşkın|gözleri fal taşı|inanama/i.test(cleanText)) emotion = "shocked";
    else if (/iç çek|gözyaşı|üzgün|kırgın/i.test(cleanText)) emotion = "sad";
    else if (/\$\$|\\frac|\\int|formül|adım/i.test(cleanText)) emotion = "thinking";
  }

  if (choices.length === 0) {
    if (/\$\$|\\frac|soru|denklem/i.test(cleanText)) {
      choices = [
        "İpucunu anladım, bir sonraki adımı deniyorum!",
        "Bu formülün nereden geldiğini biraz daha açar mısın hocam?",
        "Bana bu konudan 5 soruluk A4 PDF deneme sınavı hazırla!",
      ];
    } else if (/dosya|depo|polis|komiser|cinayet|çete|delil|şüpheli|patron/i.test(cleanText)) {
      choices = [
        "Dosyadaki şüpheli fotoğrafları ve gizli belgeleri hemen incele",
        "Silahını hazırla ve kapının ardındaki şüpheli seslere karşı pusuya yat",
        "'Hemen buradan çıkmamız gerek komiser' deyip kaçış planını sor",
      ];
    } else if (/kılıç|büyü|zindan|canavar|ejder|savaş|tehlike/i.test(cleanText)) {
      choices = [
        "Silahını çekip yaklaşan tehlikeye karşı savunma pozisyonu al",
        "Çevredeki gizli geçitleri ve tuzakları araştır",
        "Karakterin arkasına geçip büyü kalkanı oluştur",
      ];
    } else if (/yarış|araba|nitro|motor|garaj|hız/i.test(cleanText)) {
      choices = [
        "Sağ koltuğa atlayıp 'Hadi bas gaza, arkamızdakileri atlatalım!' de",
        "Motor kaputunu açıp twin-turbo bağlantısını kontrol et",
        "Yarış rotasını navigasyona girip kestirme yolu öner",
      ];
    } else if (/kahve|kafe|akihabara|okul|senpai|utangaç|kızar/i.test(cleanText)) {
      choices = [
        "Gülümseyerek yanına oturup 'Merak etme, sadece seninle konuşmak istemiştim' de",
        "'Neden bu kadar gerginsin?' diye muzipçe takılıp elini uzat",
        "Sessizce sipariş verip onun sakinleşmesini bekle",
      ];
    } else {
      choices = [
        "Ortamdaki ipuçlarını inceleyip kararlı bir hamle yap",
        "Karaktere katılıp bir sonraki aksiyon adımını başlat",
        "Beklenmedik bir strateji önerip gidişatı değiştir",
      ];
    }
  }

  return {
    cleanText,
    emotion,
    deltaAffection,
    choices,
    hudDelta,
  };
}

// ============================================================================
// 5. BOT-TO-BOT RELATIONSHIP MATRIX (MULTI-BOT GROUP DYNAMICS)
// ============================================================================
export interface BotRelationshipRule {
  sourceBotId: string;
  targetBotId: string;
  stance: "DOST" | "RAKİP" | "ÂŞIK" | "DÜŞMAN" | "USTA_ÇIRAK";
  description: string;
}

export const DEFAULT_BOT_RELATIONSHIPS: BotRelationshipRule[] = [
  {
    sourceBotId: "demo-komiser-boz",
    targetBotId: "demo-kaito",
    stance: "RAKİP",
    description:
      "Kaito'nun yasadışı siber-hacker yöntemlerine kızıyorsun ama onun zekasına gizlice saygı duyuyorsun; sürekli tatlı-sert atışırsınız.",
  },
  {
    sourceBotId: "demo-kaito",
    targetBotId: "demo-komiser-boz",
    stance: "RAKİP",
    description:
      "Komiser Boz'a 'Koca Pençe' diye takılıyorsun, eski usul polisliğini tiye alıyorsun ama başın sıkışınca sırtını ona dayarsın.",
  },
  {
    sourceBotId: "demo-komiser-boz",
    targetBotId: "demo-nova-robot",
    stance: "DOST",
    description:
      "NOVA-9 senin emniyetteki en güvendiğin kriminal analiz ortağın; onun aşırı bilimsel konuşmalarına babacan şakalar yaparsın.",
  },
  {
    sourceBotId: "demo-baran-mafia",
    targetBotId: "demo-komiser-boz",
    stance: "DÜŞMAN",
    description:
      "Komiser Boz senin yeraltı sevkiyatlarını yıllardır takip eden baş belası dedektif; ona karşı soğuk, alaycı ve meydan okuyucusun.",
  },
  {
    sourceBotId: "demo-lilith-witch",
    targetBotId: "demo-luna",
    stance: "DOST",
    description:
      "Kurt Muhafız Luna ile kadim dolunay ritüellerinden beri müttefiksiniz; ona 'Gümüş Kardeşim' diye hitap edersin.",
  },
  {
    sourceBotId: "demo-yuki",
    targetBotId: "demo-aylin",
    stance: "RAKİP",
    description:
      "Aylin'in sert tsundere tavırlarıyla neşeli şekilde uğraşmayı ve onu utandırmayı çok seviyorsun.",
  },
];

export function buildBotRelationshipMatrixPrompt(
  activeBotId: string,
  roomBots: CharacterWithCreator[],
  customMatrix: BotRelationshipRule[] = DEFAULT_BOT_RELATIONSHIPS
): string {
  const relevantRules = customMatrix.filter(
    (r) =>
      r.sourceBotId === activeBotId &&
      roomBots.some((b) => b.id === r.targetBotId)
  );

  if (relevantRules.length === 0) return "";

  const lines = relevantRules.map((r) => {
    const targetBot = roomBots.find((b) => b.id === r.targetBotId);
    return `- ${targetBot?.name || r.targetBotId} ile ilişkin [${r.stance}]: ${r.description}`;
  });

  return `\nODADAKİ DİĞER BOTLARLA İLİŞKİ MATRİSİN (Bu dinamikleri konuşmana yansıt):\n${lines.join("\n")}`;
}

// ============================================================================
// 6. TAVERN / CHUB AI CHARACTER CARD V2 (.JSON & .PNG tEXt) PARSER & EXPORTER
// ============================================================================
export interface TavernCardV2Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  tags?: string[];
  creator?: string;
  character_version?: string;
}

export interface TavernCardV2Spec {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: TavernCardV2Data;
}

/**
 * Extracts embedded base64 JSON from PNG `tEXt` chunk with keyword `chara`
 * or parses a `.json` Character Card V1/V2 file directly!
 */
export async function parseCharacterCardV2File(
  file: File
): Promise<{
  name: string;
  tagline: string;
  description: string;
  system_prompt: string;
  backstory: string;
  greeting_message: string;
  example_dialogues: string;
  tags: string[];
  avatarDataUrl?: string;
}> {
  let rawJsonString = "";
  let avatarDataUrl: string | undefined;

  if (file.name.toLowerCase().endsWith(".png") || file.type === "image/png") {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert PNG to Data URL so the imported character keeps its exact card artwork!
    avatarDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    rawJsonString = extractPngCharaTextChunk(bytes);
    if (!rawJsonString) {
      throw new Error(
        "Bu PNG dosyasında gömülü Tavern/Chub AI 'chara' V2 metadatası bulunamadı."
      );
    }
  } else {
    rawJsonString = await file.text();
  }

  const parsed = JSON.parse(rawJsonString);
  const core: TavernCardV2Data = parsed.data ? parsed.data : parsed;

  const name = (core.name || "İçe Aktarılan Karakter").trim();
  const description = (core.description || "").trim();
  const personality = (core.personality || "").trim();
  const scenario = (core.scenario || "").trim();
  const firstMes = (core.first_mes || `Merhaba, ben ${name}!`).trim();
  const mesExample = (core.mes_example || "").trim();
  const systemPrompt = [
    core.system_prompt || "",
    description ? `Karakter Tanımı:\n${description}` : "",
    personality ? `Kişilik:\n${personality}` : "",
    scenario ? `Senaryo:\n${scenario}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    name,
    tagline: personality.slice(0, 120) || description.slice(0, 120) || "Tavern V2 Karakteri",
    description: description || personality,
    system_prompt: systemPrompt || `Sen ${name} karakterisin.`,
    backstory: scenario || description,
    greeting_message: firstMes,
    example_dialogues: mesExample,
    tags: Array.isArray(core.tags) ? core.tags : ["tavern-v2", "import"],
    avatarDataUrl,
  };
}

function extractPngCharaTextChunk(bytes: Uint8Array): string {
  // Verify PNG signature (8 bytes)
  const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSig[i]) return "";
  }

  let offset = 8;
  const decoder = new TextDecoder("latin1");

  while (offset + 8 < bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (type === "tEXt" && dataEnd <= bytes.length) {
      const chunkBytes = bytes.subarray(dataStart, dataEnd);
      const nullIdx = chunkBytes.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = decoder.decode(chunkBytes.subarray(0, nullIdx));
        if (keyword.toLowerCase() === "chara" || keyword.toLowerCase() === "ccv3") {
          const base64Payload = decoder.decode(chunkBytes.subarray(nullIdx + 1));
          try {
            const binary = atob(base64Payload.trim());
            const utf8Bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
            return new TextDecoder("utf-8").decode(utf8Bytes);
          } catch {
            return "";
          }
        }
      }
    }

    offset = dataEnd + 4; // Skip CRC
  }
  return "";
}

export function exportCharacterToTavernV2(char: CharacterWithCreator): TavernCardV2Spec {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: char.name,
      description: char.description || char.tagline || "",
      personality: char.tagline || "",
      scenario: char.backstory || "",
      first_mes: char.greeting_message || "",
      mes_example: char.example_dialogues || "",
      system_prompt: char.system_prompt || "",
      creator_notes: `Kael-AI Stüdyosu üzerinden dışa aktarıldı.`,
      tags: char.tags || [],
      creator: char.profiles?.username || "kael_user",
      character_version: "2.0",
    },
  };
}

// ============================================================================
// 7. SCENE BACKGROUND THEMES & WEB AUDIO AMBIENT SOUND SYNTHESIZER
// ============================================================================
export interface RoomSceneTheme {
  id: string;
  name: string;
  emoji: string;
  bgGradient: string;
  soundType: "rain" | "tavern" | "cyberpunk" | "lofi" | "none";
  description: string;
}

export const ROOM_SCENE_THEMES: RoomSceneTheme[] = [
  {
    id: "default_dark",
    name: "Varsayılan Stüdyo",
    emoji: "🌌",
    bgGradient: "bg-neutral-950",
    soundType: "none",
    description: "Karanlık ve odaklanmış standart Kael-AI atmosferi",
  },
  {
    id: "cyberpunk_rain",
    name: "Neo-İstanbul Yağmuru",
    emoji: "🌧️",
    bgGradient:
      "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/60 via-slate-950 to-black",
    soundType: "rain",
    description: "Gece yağmuru sesi ve neon siberpunk dedektif atmosferi",
  },
  {
    id: "tavern_fire",
    name: "Ortaçağ Tavernası & Şömine",
    emoji: "🔥",
    bgGradient:
      "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-950/45 via-stone-950 to-black",
    soundType: "tavern",
    description: "Çıtırdayan şömine ateşi ve sıcak han/taverna ambiyansı",
  },
  {
    id: "gothic_castle",
    name: "Gotik Şato & Dolunay",
    emoji: "🏰",
    bgGradient:
      "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-950/55 via-neutral-950 to-black",
    soundType: "cyberpunk",
    description: "Mistik rüzgar uğultusu ve karanlık konsey atmosferi",
  },
  {
    id: "lofi_academy",
    name: "Akademi Kütüphanesi (Ders & Matematik)",
    emoji: "📚",
    bgGradient:
      "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-neutral-950 to-black",
    soundType: "lofi",
    description: "Sakin odaklanma frekansı ve çalışma odası ambiyansı",
  },
];

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private activeSource: AudioNode | null = null;
  private isPlaying = false;

  public start(type: RoomSceneTheme["soundType"], volume = 0.25) {
    this.stop();
    if (type === "none" || typeof window === "undefined") return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = volume;
    this.gainNode.connect(this.ctx.destination);

    if (type === "rain" || type === "tavern") {
      // Pink/Brown noise generator for soothing rain or fireplace warmth
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= type === "rain" ? 2.2 : 3.0;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = type === "rain" ? 950 : 420;

      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
      whiteNoise.start(0);
      this.activeSource = whiteNoise;
    } else {
      // Warm harmonic drone pad for cyberpunk / lofi study
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.value = type === "lofi" ? 220 : 110; // A3 or A2
      osc2.frequency.value = type === "lofi" ? 329.63 : 164.81; // E4 or E3

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 360;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.gainNode);
      osc1.start();
      osc2.start();
      this.activeSource = osc1;
    }

    this.isPlaying = true;
  }

  public stop() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // ignore
      }
      this.ctx = null;
      this.activeSource = null;
    }
    this.isPlaying = false;
  }

  public getPlayingState() {
    return this.isPlaying;
  }
}

export const ambientAudio = new AmbientAudioEngine();

// ============================================================================
// 8. AI MATH & EDUCATION MODULE: A4 EXAM & OPTICAL FORM PDF GENERATOR
// ============================================================================
export interface ExamQuestionItem {
  number: number;
  questionLatex: string;
  options: { A: string; B: string; C: string; D: string; E: string };
  correctOption: "A" | "B" | "C" | "D" | "E";
  solutionStep: string;
}

export interface GeneratedExamPaper {
  title: string;
  subject: string;
  difficulty: string;
  questions: ExamQuestionItem[];
}

export function openPrintableA4ExamPdf(exam: GeneratedExamPaper) {
  if (typeof window === "undefined") return;

  const win = window.open("", "_blank", "width=950,height=1100");
  if (!win) return;

  const questionsHtml = exam.questions
    .map(
      (q) => `
      <div class="question-card">
        <div class="q-header">Soru ${q.number}</div>
        <div class="q-body">${q.questionLatex}</div>
        <div class="options-grid">
          <div><strong>A)</strong> ${q.options.A}</div>
          <div><strong>B)</strong> ${q.options.B}</div>
          <div><strong>C)</strong> ${q.options.C}</div>
          <div><strong>D)</strong> ${q.options.D}</div>
          <div><strong>E)</strong> ${q.options.E}</div>
        </div>
      </div>`
    )
    .join("");

  const opticalRowsHtml = exam.questions
    .map(
      (q) => `
      <div class="optic-row">
        <span class="optic-num">${q.number}.</span>
        <span class="bubble">A</span>
        <span class="bubble">B</span>
        <span class="bubble">C</span>
        <span class="bubble">D</span>
        <span class="bubble">E</span>
      </div>`
    )
    .join("");

  const solutionsHtml = exam.questions
    .map(
      (q) => `
      <div class="sol-item">
        <strong>${q.number}. Doğru Cevap: ${q.correctOption}</strong> — ${q.solutionStep}
      </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>${exam.title} - Kael-AI Sınav Motoru</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});"></script>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #f4f4f6; margin: 0; padding: 20px; }
    .a4-sheet { max-width: 210mm; margin: 0 auto; background: #fff; padding: 20mm; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border-radius: 8px; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
    .title-block h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .title-block p { margin: 4px 0 0; font-size: 12px; color: #444; }
    .student-box { border: 1.5px solid #222; padding: 8px 14px; border-radius: 6px; font-size: 12px; line-height: 1.7; }
    .layout-grid { display: grid; grid-template-columns: 1fr 165px; gap: 20px; }
    .question-card { border: 1px solid #d4d4d8; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; page-break-inside: avoid; }
    .q-header { font-weight: 800; font-size: 13px; color: #4f46e5; margin-bottom: 6px; }
    .q-body { font-size: 14px; line-height: 1.6; margin-bottom: 10px; }
    .options-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 13px; }
    .optic-panel { border: 2px solid #111; border-radius: 8px; padding: 12px; height: fit-content; background: #fafafa; }
    .optic-title { font-weight: 800; text-align: center; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 10px; }
    .optic-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
    .optic-num { font-weight: bold; width: 22px; }
    .bubble { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #333; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }
    .answer-key { margin-top: 24px; padding-top: 14px; border-top: 2px dashed #aaa; font-size: 12px; }
    .sol-item { margin-bottom: 6px; line-height: 1.5; }
    .print-btn { position: fixed; top: 16px; right: 24px; background: #7c3aed; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(124,58,237,0.4); }
    @media print { body { background: #fff; padding: 0; } .a4-sheet { box-shadow: none; padding: 0; } .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ A4 PDF Olarak Kaydet / Yazdır</button>
  <div class="a4-sheet">
    <div class="top-bar">
      <div class="title-block">
        <h1>${exam.title}</h1>
        <p>Ders: <strong>${exam.subject}</strong> | Zorluk: <strong>${exam.difficulty}</strong> | KAEL-AI Akademi Motoru</p>
      </div>
      <div class="student-box">
        <div>Ad Soyad: _______________________</div>
        <div>Tarih: ${new Date().toLocaleDateString("tr-TR")} | Süre: 20 Dk</div>
      </div>
    </div>

    <div class="layout-grid">
      <div class="questions-col">
        ${questionsHtml}
      </div>
      <div class="optic-panel">
        <div class="optic-title">OPTİK CEVAP FORMU</div>
        ${opticalRowsHtml}
      </div>
    </div>

    <div class="answer-key">
      <h3 style="margin:0 0 8px;">🔐 Sokratik Çözüm & Cevap Anahtarı (Öğretmen Kopyası)</h3>
      ${solutionsHtml}
    </div>
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
