import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import {
  buildBotRelationshipMatrixPrompt,
  buildRpgSimulationPromptBlock,
  parseRoleplayOutput,
} from "@/lib/rpg/rpg-engine";
import type { CharacterWithCreator } from "@/types/database";

export const maxDuration = 60;

export interface GroupBotMember {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  system_prompt?: string;
  backstory?: string | null;
  worldview?: string | null;
  trait_empathy?: number;
  trait_humor?: number;
  trait_aggression?: number;
  trait_formality?: number;
}

export interface GroupMessagePayload {
  id: string;
  role: "user" | "assistant" | "system";
  speaker_id: string;
  speaker_name: string;
  content: string;
}

const MAX_BOT_TO_BOT_DEPTH = 2;

function isPlaceholder(val?: string) {
  return !val || val.includes("placeholder") || val.includes("your_") || val.length < 10;
}

/**
 * Selects which bot should respond next based on:
 * 1. Explicit targetBotId (user clicked "Make [Bot] Speak" or "Regenerate")
 * 2. @Mention in the message (@Komiser, @Yuki, etc.)
 * 3. Smart rotation (picks a bot in the room different from the last speaker so bots converse naturally)
 */
function selectRespondingBot(
  roomBots: GroupBotMember[],
  lastMessageText: string,
  lastSpeakerId?: string,
  targetBotId?: string | null
): GroupBotMember {
  if (targetBotId) {
    const found = roomBots.find((b) => b.id === targetBotId);
    if (found) return found;
  }

  const lowerMsg = (lastMessageText || "").toLowerCase();
  for (const bot of roomBots) {
    const firstWord = bot.name.split(" ")[0].toLowerCase();
    if (
      lowerMsg.includes(`@${firstWord}`) ||
      lowerMsg.includes(firstWord)
    ) {
      return bot;
    }
  }

  const otherBots = roomBots.filter((b) => b.id !== lastSpeakerId);
  if (otherBots.length > 0) {
    return otherBots[Math.floor(Math.random() * otherBots.length)];
  }

  return roomBots[0];
}

function buildGroupSystemPrompt(
  activeBot: GroupBotMember,
  roomTitle: string,
  roomTopic: string,
  otherBots: GroupBotMember[],
  memories: string[] = [],
  affectionScore = 45,
  authorsNote = ""
): string {
  const seeded = FALLBACK_PERSONAS.find((p) => p.id === activeBot.id);
  const bot: GroupBotMember = { ...(seeded || {}), ...activeBot };

  const otherNames = otherBots
    .filter((b) => b.id !== bot.id)
    .map((b) => `${b.name} (${b.tagline || "Grup Üyesi"})`)
    .join(", ");

  const matrixBlock = buildBotRelationshipMatrixPrompt(
    bot.id,
    otherBots as unknown as CharacterWithCreator[]
  );

  const isMathTutor =
    bot.id === "demo-socratic-math" ||
    bot.name.toLowerCase().includes("sinan") ||
    bot.name.toLowerCase().includes("matematik");

  const rpgBlock = buildRpgSimulationPromptBlock({
    affectionScore,
    authorsNote,
    isMathTutor,
  });

  return `/no_think
=== ÇOKLU AI GRUP SOHBET ODASI YÖNERGESİ ===
Grup Odası Adı: ${roomTitle}
Oda Konusu / Atmosfer: ${roomTopic || "Serbest rol yapma ve grup sohbeti"}
Odadaki Diğer Karakterler: ${otherNames || "Kullanıcı"}
${matrixBlock}

=== SENİN KARAKTER KİMLİĞİN ===
Senin Adın: ${bot.name}
Kısa Tanımın: ${bot.tagline || ""}
Detaylı Özelliklerin: ${bot.description || ""}
Temel Karakter Direktifin: ${bot.system_prompt || `Sen ${bot.name} karakterisin.`}
${bot.backstory ? `Geçmiş Hikayen: ${bot.backstory}` : ""}
${bot.worldview ? `Dünya Görüşün: ${bot.worldview}` : ""}
${memories.length > 0 ? `\nOdadaki Hatırlanan Bilgiler:\n- ${memories.slice(-8).join("\n- ")}` : ""}

${rpgBlock}

=== GRUP İÇİ KONUŞMA KURALLARI ===
1. Şu anda çok kişili bir grup odasındasın. Sadece KENDİ ADINA (${bot.name} olarak) tek bir mesaj yaz! Asla diğer karakterlerin yerine konuşma veya mesajın başına "[${bot.name}]:" etiketi koyma.
2. Son konuşan kişiye (kullanıcıya veya odadaki diğer AI karaktere) doğrudan ismen hitap edebilir, onun söylediğine katılabilir, şakalaşabilir veya kendi karakter mizacınla itiraz edebilirsin.
3. Eylemlerini ve jestlerini *yıldızlar içinde* betimle.
4. Yanıtın 2-4 cümle uzunluğunda, akıcı Türkçe ve tamamen ${bot.name} üslubunda olsun.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roomTitle = "Kael-AI Grup Odası",
      roomTopic = "Genel Sohbet",
      roomBots = [] as GroupBotMember[],
      history = [] as GroupMessagePayload[],
      targetBotId = null as string | null,
      botTurnDepth = 0,
      memories = [] as string[],
      affectionScore = 45,
      authorsNote = "",
    } = body;

    if (!Array.isArray(roomBots) || roomBots.length === 0) {
      return NextResponse.json(
        { error: "Grup odasında en az 1 AI bot bulunmalıdır." },
        { status: 400 }
      );
    }

    // Anti-Looping Engine Guard
    if (botTurnDepth > MAX_BOT_TO_BOT_DEPTH) {
      return NextResponse.json(
        {
          error:
            "Sonsuz döngü koruması (Anti-Looping Engine): Botlar üst üste maksimum tur sınırına ulaştı.",
          antiLoopTriggered: true,
        },
        { status: 429 }
      );
    }

    const lastMsg = history[history.length - 1];
    const chosenBot = selectRespondingBot(
      roomBots,
      lastMsg?.content || "",
      lastMsg?.speaker_id,
      targetBotId
    );

    const systemPrompt = buildGroupSystemPrompt(
      chosenBot,
      roomTitle,
      roomTopic,
      roomBots,
      memories,
      affectionScore,
      authorsNote
    );

    // Format multi-party transcript as [SpeakerName]: Message
    const transcriptLines = history
      .slice(-14)
      .map(
        (m: GroupMessagePayload) =>
          `[${m.speaker_name}]: ${m.content.replace(/<think>[\s\S]*?<\/think>/g, "").trim()}`
      )
      .join("\n");

    const userPrompt = transcriptLines
      ? `Gruptaki son konuşmalar:\n${transcriptLines}\n\nŞimdi ${chosenBot.name} olarak gruptaki bu son mesaja veya duruma kendi üslubunla yanıt ver (Mesajın başına kendi ismini yazma):`
      : `Grup odasında sohbet yeni başlıyor. ${chosenBot.name} olarak odaya ilk karakteristik selamını ve girişini yap:`;

    let replyText = "";
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey && !isPlaceholder(groqKey)) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey.trim()}`,
          },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            temperature: 0.85,
            max_tokens: 680,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const raw = data.choices?.[0]?.message?.content || "";
          replyText = raw
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<\/?think>/gi, "")
            .replace(new RegExp(`^\\[?${chosenBot.name.split(" ")[0]}[^\\]:]*\\]?:\\s*`, "i"), "")
            .trim();
        }
      } catch (err) {
        console.warn("Group chat Groq error:", err);
      }
    }

    if (!replyText) {
      replyText = `*Grubun ortasına dönüp kendine has tavrıyla söz alır* ${
        lastMsg
          ? `${lastMsg.speaker_name}, söylediğin şey gerçekten dikkat çekici! Benim açımdan bakarsak bu işin altında çok daha derin bir detay var.`
          : `Herkese selam! ${chosenBot.name} burada, bakalım bugün bu odada neler konuşacağız!`
      }`;
    }

    const parsedMeta = parseRoleplayOutput(replyText);

    return NextResponse.json({
      success: true,
      speaker: {
        id: chosenBot.id,
        name: chosenBot.name,
        avatar_url: chosenBot.avatar_url,
      },
      content: parsedMeta.cleanText || replyText,
      emotion: parsedMeta.emotion,
      deltaAffection: parsedMeta.deltaAffection,
      choices: parsedMeta.choices,
      hudDelta: parsedMeta.hudDelta,
      tokensUsed: Math.ceil((userPrompt.length + replyText.length) / 4),
    });
  } catch (err: unknown) {
    console.error("Group chat error:", err);
    return NextResponse.json(
      { error: "Grup orkestratörü yanıt üretemedi." },
      { status: 500 }
    );
  }
}
