import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const POLLEN_KEY = process.env.POLLEN_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Ses dosyası bulunamadı." },
        { status: 400 }
      );
    }

    // 1. Groq Whisper-Large-V3-Turbo (Türkçe, çok hızlı <0.5 sn)
    try {
      const groqForm = new FormData();
      groqForm.append("file", audioFile, "voice.webm");
      groqForm.append("model", "whisper-large-v3-turbo");
      groqForm.append("language", "tr");
      groqForm.append("response_format", "json");

      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_KEY}`,
          },
          body: groqForm,
        }
      );

      if (groqRes.ok) {
        const data = await groqRes.json();
        const text = String(data.text || "").trim();
        return NextResponse.json({ text });
      }
    } catch {
      // Fallback'e geç
    }

    // 2. Yedek: Pollinations Whisper Large V3
    try {
      const pollenForm = new FormData();
      pollenForm.append("file", audioFile, "voice.webm");
      pollenForm.append("model", "whisper-large-v3");
      pollenForm.append("language", "tr");

      const pollenRes = await fetch(
        "https://gen.pollinations.ai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${POLLEN_KEY}`,
          },
          body: pollenForm,
        }
      );

      if (pollenRes.ok) {
        const data = await pollenRes.json();
        const text = String(data.text || "").trim();
        return NextResponse.json({ text });
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      { error: "Ses metne dönüştürülemedi." },
      { status: 500 }
    );
  } catch (err) {
    console.error("STT route error:", err);
    return NextResponse.json({ error: "STT sunucu hatası." }, { status: 500 });
  }
}
