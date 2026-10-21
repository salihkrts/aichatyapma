import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const STYLE_PRESETS: Record<string, string> = {
  realistic:
    "photorealistic portrait, 85mm lens, natural skin texture, cinematic lighting, ultra detailed, 8k",
  anime:
    "anime style illustration, vibrant colors, clean line art, detailed expressive eyes, studio quality, masterpiece",
  furry:
    "mature anthropomorphic furry character art, adult proportions, tall athletic build, realistic detailed fur texture, subtle shading, dramatic cinematic lighting, high-end digital furry illustration, highly detailed, 8k",
  fursona:
    "mature fursona character art, adult proportions, expressive fur patterns, stylish outfit, detailed digital furry illustration, cinematic lighting, highly detailed, 8k",
  robotic:
    "futuristic robotic android cyborg character, sleek titanium and carbon chassis, glowing optical sensors, exposed cybernetic neural conduits, sci-fi concept art masterpiece, 8k",
  persona:
    "stylized roleplay persona character portrait, dramatic cinematic atmosphere, distinct costume and iconic props, artstation concept art masterpiece, 8k",
  fantasy:
    "epic fantasy digital painting, dramatic lighting, highly detailed, artstation concept art, masterpiece",
  "3d":
    "high quality 3d character render, realistic materials, adult proportions, soft global illumination, octane render, detailed outfit, 8k",
};

// Çocuksu / oyuncak görünümünü engelleyen ortak ifade (FLUX olumsuzları iyi anlamaz, olumlu tanım kullanılır)
const ANTI_CHILDISH =
  "serious mature adult character, tall heroic adult body proportions, realistic anatomy, intense confident expression, gritty cinematic realism";

const ARCHETYPE_HINTS: Record<string, string> = {
  realistic: "The subject MUST be a realistic human character.",
  anime: "The subject MUST be an anime/manga character.",
  furry:
    "CRITICAL: The subject MUST be an anthropomorphic humanoid furry character with ADULT human proportions (tall, broad shoulders, realistic anatomy, like a grown man or woman), wearing full human clothes/uniforms and holding props, with a serious expressive face. NEVER a plush toy, mascot, chibi, or four-legged wild animal.",
  fursona:
    "CRITICAL: The subject MUST be an anthropomorphic fursona with adult human proportions and posture, stylish clothes/accessories and expressive facial features, NEVER a plush toy, chibi, or feral animal.",
  robotic:
    "CRITICAL: The subject MUST be a robotic android, cyborg, or mecha unit with visible mechanical joints, glowing optics, and metallic/synthetic armor.",
  persona:
    "The subject MUST clearly display their specific profession, uniform, badge, tools, and roleplay persona.",
  "3d":
    "The subject MUST be a 3D rendered character with adult proportions wearing their full profession outfit and accessories.",
};

// 18+ modunda reşit olmayan ifadeler kesinlikle engellenir
const MINOR_PATTERN =
  /(çocuk|cocuk|bebek|küçük kız|kucuk kiz|küçük erkek|lise|ortaokul|ilkokul|okul önlüğü|öğrenci|ogrenci|genç kız|genc kiz|ergen|\bminor\b|\bchild|\bkids?\b|toddler|\bteen|underage|young girl|young boy|schoolgirl|schoolboy|school uniform|\bloli|shota|\b(?:[1-9]|1[0-7])\s*(?:yaş|yas|yaşında|yasinda|years?))/i;

function isValidKey(val?: string) {
  return !!val && !val.includes("placeholder") && !val.includes("your_") && val.length > 10;
}

async function enhancePrompt(raw: string, style: string, nsfw: boolean): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!isValidKey(groqKey)) return raw;

  const archetypeInstruction = ARCHETYPE_HINTS[style] || "";
  const nsfwInstruction = nsfw
    ? " This is an ADULT-ONLY (18+) mature artwork request for a verified adult user. The character MUST be clearly an adult (25+ years old) with adult anatomy and proportions. Preserve the user's mature/sensual intent faithfully in tasteful artistic wording; never reduce it to a plain portrait."
    : "";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey!.trim()}`,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        temperature: 0.35,
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content:
              "/no_think You convert Turkish character descriptions into a precise English visual prompt for FLUX image generation. " +
              "Describe EXACTLY what the user asked: subject, species, outfit, pose (e.g. sitting, standing), setting and mood. Keep every detail the user gave (e.g. 'kaplan polis oturuyor' = a tiger police officer sitting). " +
              "CRITICAL RULE: If the user mentions an animal with a job or role (e.g. 'polis ayı', 'kaplan polis', 'dedektif kurt'), you MUST describe an ANTHROPOMORPHIC HUMANOID ADULT character wearing that exact uniform, badge, hat and coat in an appropriate cinematic setting — NEVER just a wild animal, and NEVER cute, plush, toy-like or childish. Use a serious, mature, realistic look. " +
              archetypeInstruction +
              nsfwInstruction +
              " Output ONLY the single-line English prompt, max 80 words, no quotes, no explanations.",
          },
          {
            role: "user",
            content: `Selected Style/Archetype: ${style}\nUser Description: ${raw}`,
          },
        ],
      }),
    });

    if (!res.ok) return raw;
    const data = await res.json();
    let text: string = data.choices?.[0]?.message?.content || "";
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
    text = text.replace(/^["'`]+|["'`]+$/g, "").split("\n").filter(Boolean).pop() || "";
    // Model reddederse ham tarife dön
    if (/^(i can't|i cannot|sorry|i'm sorry|üzgünüm)/i.test(text)) return raw;
    return text.length > 8 ? text : raw;
  } catch {
    return raw;
  }
}

function getPollenKeys(): string[] {
  const rawList = (process.env.POLLEN_API_KEYS || "").split(",");
  const single = (process.env.POLLEN_API_KEY || process.env.POLLINATIONS_API_KEY || "").trim();
  const all = [...rawList.map((k) => k.trim()), single].filter(isValidKey);
  return Array.from(new Set(all));
}

async function fetchImageWithFallback(
  prompt: string,
  seed: number,
  keys: string[],
  preferredIndex: number,
  model: string,
  nsfw: boolean
): Promise<string | null> {
  const encPrompt = encodeURIComponent(prompt);

  // 1. Yol: Havuzdaki anahtarları sırayla dene (her varyasyon farklı bir anahtarla başlar)
  if (keys.length > 0) {
    const startIdx = preferredIndex % keys.length;
    const orderedKeys = [...keys.slice(startIdx), ...keys.slice(0, startIdx)];

    for (const key of orderedKeys) {
      try {
        const url = `https://gen.pollinations.ai/image/${encPrompt}?model=${encodeURIComponent(
          model
        )}&width=1024&height=1024&seed=${seed}&nologo=true&enhance=false&safe=${nsfw ? "false" : "true"}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(35000),
        });

        const type = res.headers.get("content-type") || "";
        if (res.ok && type.startsWith("image/")) {
          const buf = Buffer.from(await res.arrayBuffer());
          return `data:${type};base64,${buf.toString("base64")}`;
        }

        const errText = await res.text().catch(() => "");
        console.warn(`Pollen key ${key.slice(0, 10)}... status ${res.status}:`, errText.slice(0, 120));
      } catch (err) {
        console.warn(`Pollen key error:`, err);
      }
    }
  }

  // 2. Yol: Anahtarsız / Ücretsiz public endpoint (image.pollinations.ai)
  try {
    const publicUrl = `https://image.pollinations.ai/prompt/${encPrompt}?model=${encodeURIComponent(
      model
    )}&width=768&height=768&seed=${seed}&nologo=true&enhance=false&safe=${nsfw ? "false" : "true"}`;

    const res = await fetch(publicUrl, {
      signal: AbortSignal.timeout(35000),
    });

    const type = res.headers.get("content-type") || "";
    if (res.ok && type.startsWith("image/")) {
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${type};base64,${buf.toString("base64")}`;
    }
    console.warn("Public Pollen failed (status " + res.status + "):", (await res.text().catch(() => "")).slice(0, 150));
  } catch (err) {
    console.warn("Public Pollen request error:", err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, style = "anime", nsfw = false } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Karakter görünüm tarifi gerekli" }, { status: 400 });
    }

    const wantsNsfw = nsfw === true;
    if (wantsNsfw && MINOR_PATTERN.test(prompt)) {
      return NextResponse.json(
        {
          error:
            "18+ modunda sadece yetişkin karakterler çizilebilir. Tarifte reşit olmayan/okul çağı ifadeleri var, lütfen karakteri yetişkin olarak tarif et.",
        },
        { status: 400 }
      );
    }

    const pollenKeys = getPollenKeys();
    const model = (process.env.IMAGE_MODEL || "flux").trim();
    const englishPrompt = await enhancePrompt(prompt.trim(), String(style), wantsNsfw);
    const stylePreset = STYLE_PRESETS[style as string] || STYLE_PRESETS.anime;
    const adultTag = wantsNsfw ? ", adult 25+ years old, mature adult anatomy" : "";
    const finalPrompt = `${englishPrompt}, ${stylePreset}, ${ANTI_CHILDISH}${adultTag}, single character, no text, no watermark`;

    const baseSeed = Math.floor(Math.random() * 900000) + 100000;
    const count = 4;
    const seeds = Array.from({ length: count }, (_, i) => baseSeed + i * 7919);

    const results = await Promise.all(
      seeds.map((s, idx) => fetchImageWithFallback(finalPrompt, s, pollenKeys, idx, model, wantsNsfw))
    );

    const images = results.filter((x): x is string => !!x);

    if (images.length === 0) {
      return NextResponse.json(
        {
          error:
            "Görsel motoru şu an yoğun veya API kotası geçici olarak dolmuş olabilir. Birkaç saniye sonra tekrar deneyebilir veya aşağıdan doğrudan kendi avatar fotoğrafını yükleyebilirsin.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      images,
      prompt: prompt.trim(),
      enhancedPrompt: englishPrompt,
      nsfw: wantsNsfw,
      success: true,
    });
  } catch (error: unknown) {
    console.error("Görsel üretme hatası:", error);
    return NextResponse.json({ error: "Görsel üretilemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
