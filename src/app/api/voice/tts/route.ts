import { NextRequest, NextResponse } from "next/server";
import { CHARACTER_VOICES, cleanTextForSpeech } from "@/lib/voice/voices";

export const maxDuration = 30;

const POLLEN_KEY = process.env.POLLEN_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = String(body.text || "").trim();
    const voiceId = String(body.voiceId || "anime-girl-yuki");

    const cleanedText = cleanTextForSpeech(rawText, false);
    if (!cleanedText) {
      return NextResponse.json({ error: "Seslendirilecek metin boş." }, { status: 400 });
    }

    const voiceOption =
      CHARACTER_VOICES.find((v) => v.id === voiceId) || CHARACTER_VOICES[0];

    // 1. Birincil Neural Ses Modeli (OpenAI TTS-1 veya Microsoft MAI-Voice-2.1-Flash)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const res = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${POLLEN_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: voiceOption.providerModel,
          input: cleanedText,
          voice: voiceOption.providerVoice,
          speed: voiceOption.speed,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const audioBuffer = await res.arrayBuffer();
        if (audioBuffer.byteLength > 500) {
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        }
      }
    } catch {
      // Fallback'e geç
    }

    // 2. Yedek: OpenAI TTS-1 ile aynı cinsiyet/karakter tonunda ses üret
    try {
      const res2 = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${POLLEN_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: cleanedText,
          voice: voiceOption.fallbackOpenAiVoice,
          speed: voiceOption.speed,
        }),
      });

      if (res2.ok) {
        const audioBuffer = await res2.arrayBuffer();
        if (audioBuffer.byteLength > 500) {
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        }
      }
    } catch {
      // Son yedek Google TTS'e geç
    }

    // 3. Son Yedek: Google Translate Türkçe TTS
    const shortText = encodeURIComponent(cleanedText.slice(0, 200));
    const googleUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${shortText}&tl=tr&client=tw-ob`;
    const gRes = await fetch(googleUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (gRes.ok) {
      const gBuf = await gRes.arrayBuffer();
      return new NextResponse(gBuf, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: "Ses üretilemedi." }, { status: 500 });
  } catch (err) {
    console.error("TTS route error:", err);
    return NextResponse.json({ error: "TTS sunucu hatası." }, { status: 500 });
  }
}
