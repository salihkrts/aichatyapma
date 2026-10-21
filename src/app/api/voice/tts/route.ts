import { NextRequest, NextResponse } from "next/server";
import { CHARACTER_VOICES, cleanTextForSpeech } from "@/lib/voice/voices";
import { EdgeTTS } from "node-edge-tts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

    // 1. Birincil Neural Ses Modeli: Microsoft Edge TTS (Ultra-Doğal, Gerçekçi Türkçe Erkek & Kadın)
    try {
      const selectedVoice =
        voiceOption.edgeVoice ||
        (voiceOption.gender === "male" ? "tr-TR-AhmetNeural" : "tr-TR-EmelNeural");

      const tmpFile = path.join(
        os.tmpdir(),
        `edge_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
      );

      const edgeTts = new EdgeTTS({
        voice: selectedVoice,
        lang: "tr-TR",
        pitch: voiceOption.edgePitch || "default",
        rate: voiceOption.edgeRate || "default",
        timeout: 8000,
      });

      await edgeTts.ttsPromise(cleanedText, tmpFile);
      const audioBuffer = await fs.readFile(tmpFile);
      await fs.unlink(tmpFile).catch(() => {});

      if (audioBuffer && audioBuffer.byteLength > 500) {
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch (edgeErr) {
      console.warn("EdgeTTS error, falling back to secondary:", edgeErr);
    }

    // 2. Yedek: Pollinations TTS (eğer kota/anahtar varsa)
    if (POLLEN_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
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
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        }
      } catch {
        // Fallback to Google
      }
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
