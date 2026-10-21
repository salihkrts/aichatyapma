import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 45;

export interface ArchitectProfile {
  name: string;
  tagline: string;
  description: string;
  category:
    | "anime"
    | "mentors"
    | "historical"
    | "therapists"
    | "rpg_gamemasters"
    | "assistants"
    | "fictional"
    | "general";
  trait_empathy: number;
  trait_humor: number;
  trait_aggression: number;
  trait_formality: number;
  trait_creativity: number;
  trait_curiosity: number;
  trait_confidence: number;
  trait_warmth: number;
  system_prompt: string;
  backstory: string;
  worldview: string;
  secrets: string;
  example_dialogues: string;
  greeting_message: string;
  avatar_prompt: string;
  tags: string[];
}

const ARCHETYPE_INSTRUCTIONS: Record<string, string> = {
  realistic:
    "KARAKTER TÜRÜ: GERÇEKÇİ İNSAN (Realistic Human). Gerçek dünyada yaşayan, mesleği, kıyafetleri ve insani duyguları gerçekçi olan bir karakter tasarla.",
  anime:
    "KARAKTER TÜRÜ: ANİME / MANGA KARAKTERİ. Anime dünyasına özgü canlı ifadeler, estetik görünüm, karakteristik jestler ve duygusal derinlik kullan.",
  furry:
    "KARAKTER TÜRÜ: FURRY (Antropomorfik İnsansı Hayvan). İki ayak üzerinde duran, mesleğine uygun kıyafet/üniforma/rozet/zırh giyen, kürkü, kulakları, pençeleri ve keskin duyuları olan antropomorfik bir karakter tasarla. Avatar promptunda KESİNLİKLE 'anthropomorphic humanoid furry character wearing [exact uniform/outfit]' yazmalı, asla sıradan vahşi hayvan olmamalı!",
  fursona:
    "KARAKTER TÜRÜ: FURSONA (Kişisel Antropomorfik Furry Kimliği). Kendine özgü kürk desenleri, renkli kulak/kuyruk detayları, tarz kıyafetleri, aksesuarları ve çok özgün bir mizacı olan kişisel bir Fursona tasarla. Avatar promptunda KESİNLİKLE 'anthropomorphic fursona character wearing stylish clothes and accessories' belirtilmeli.",
  robotic:
    "KARAKTER TÜRÜ: ROBOTİK / SİBER-ANDROİD / MECHA. Titanyum/karbon şasiye, parlayan optik sensörlere, servo motorlara ve kuantum/yapay sinir ağına sahip bir robot veya cyborg tasarla. Konuşma tarzında sensör verileri, protokoller ve makine-insan felsefesi olsun.",
  persona:
    "KARAKTER TÜRÜ: ÖZEL PERSONA / FANTASTİK ARkETİP. Kendine has kostümü, unvanı, ikonik eşyaları ve karizmatik rol yapma kimliği olan güçlü bir Persona tasarla.",
  "3d":
    "KARAKTER TÜRÜ: 3D ANİMASYON KARAKTERİ (Zootopia / Pixar / Arcane Stili). Mesleğine uygun tam kıyafetli, çok canlı mimiklere sahip sinematik 3D karakter tasarla.",
};

function isValidKey(val?: string) {
  return !!val && !val.includes("placeholder") && !val.includes("your_") && val.length > 10;
}

function describeTraitSummary(context?: Record<string, unknown>): string {
  if (!context) return "";
  const parts: string[] = [];
  if (typeof context.name === "string" && context.name.trim()) {
    parts.push(`İsim: ${context.name}`);
  }
  if (typeof context.tagline === "string" && context.tagline.trim()) {
    parts.push(`Slogan: ${context.tagline}`);
  }
  if (typeof context.description === "string" && context.description.trim()) {
    parts.push(`Açıklama: ${context.description}`);
  }
  if (typeof context.avatar_prompt === "string" && context.avatar_prompt.trim()) {
    parts.push(`Görsel Tarifi: ${context.avatar_prompt}`);
  }
  if (typeof context.category === "string" && context.category.trim()) {
    parts.push(`Kategori: ${context.category}`);
  }
  const traits = [
    ["Empati", context.trait_empathy],
    ["Mizah", context.trait_humor],
    ["Sertlik/Agresiflik", context.trait_aggression],
    ["Resmiyet", context.trait_formality],
    ["Yaratıcılık", context.trait_creativity],
    ["Merak", context.trait_curiosity],
    ["Özgüven", context.trait_confidence],
    ["Sıcakkanlılık", context.trait_warmth],
  ]
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k}: %${v}`);

  if (traits.length) {
    parts.push(`Kişilik Matrisi (${traits.join(", ")})`);
  }
  return parts.join(" | ");
}

export async function POST(req: NextRequest) {
  try {
    let idea = "";
    let archetype = "furry";
    let currentData: Record<string, unknown> | undefined;

    try {
      const textBody = await req.text();
      try {
        const parsed = JSON.parse(textBody);
        idea = parsed?.idea || "";
        archetype = parsed?.archetype || "anime";
        currentData = parsed?.currentData;
      } catch {
        idea = textBody.trim();
      }
    } catch (readErr) {
      console.warn("Body read error:", readErr);
    }

    const contextSummary = describeTraitSummary(currentData);
    const effectiveIdea = (
      idea.trim() ||
      (typeof currentData?.name === "string" ? currentData.name : "") ||
      (typeof currentData?.avatar_prompt === "string" ? currentData.avatar_prompt : "") ||
      (typeof currentData?.tagline === "string" ? currentData.tagline : "")
    ).trim();

    if (!effectiveIdea) {
      return NextResponse.json(
        { error: "Lütfen karakter fikrini, ismini veya görünümünü belirtin." },
        { status: 400 }
      );
    }

    const archetypeRule = ARCHETYPE_INSTRUCTIONS[archetype] || ARCHETYPE_INSTRUCTIONS.persona;

    const groqKey = process.env.GROQ_API_KEY;
    if (isValidKey(groqKey)) {
      try {
        const promptForAi = `/no_think
Kullanıcının karakter fikri: "${effectiveIdea}"
Seçilen Karakter Türü / Stil: "${archetype}" -> ${archetypeRule}
${contextSummary ? `Mevcut Karakter Bilgileri ve Kişilik Oranları: ${contextSummary}` : ""}

Bu karaktere ve seçilen "${archetype}" türüne %100 uyumlu, klişelerden uzak, çok özgün bir Türkçe rol yapma (roleplay) karakter profili oluştur.
ÇOK ÖNEMLİ GÖRSEL KURALI: "avatar_prompt" alanını İngilizce yazarken karakterin mesleğini, üniformasını, rozetini, kıyafetlerini ve seçilen "${archetype}" türünü (örneğin polis ayı ise "anthropomorphic grizzly bear police detective wearing dark blue police uniform, cap, gold police badge and trench coat") çok net ve eksiksiz tarif et; asla sadece düz hayvan veya kıyafetsiz figür yazma!

Yanıtın kesilmemesi için her alanı özlü (1-2 cümle) tut ve SADECE aşağıdaki geçerli JSON objesini döndür:
{
  "name": "Karakterin özgün ismi",
  "tagline": "Tek cümlelik çarpıcı sloganı (emojili)",
  "description": "Karakterin 2 cümlelik etkileyici tanıtımı",
  "category": "anime | fictional | general | rpg_gamemasters | mentors",
  "trait_empathy": 75,
  "trait_humor": 65,
  "trait_aggression": 45,
  "trait_formality": 40,
  "trait_creativity": 85,
  "trait_curiosity": 85,
  "trait_confidence": 90,
  "trait_warmth": 75,
  "system_prompt": "Karakterin kimliğini, '${archetype}' doğasını, kendine özgü konuşma üslubunu ve *yıldız içinde* yapacağı jestleri anlatan Türkçe sistem talimatı (3 cümle)",
  "backstory": "Karakterin geçmiş hikayesi (2-3 cümle)",
  "worldview": "Karakterin hayata bakış açısı ve felsefesi (1-2 cümle)",
  "secrets": "Karakterin gizli sırrı veya zaafı (1-2 cümle)",
  "example_dialogues": "<START>\\n{{user}}: Selam, işler nasıl?\\n{{char}}: *Karaktere özgü hareket* Karakterin ağzından özgün cevap",
  "greeting_message": "*Karakterin kıyafetini, ortamını ve hareketini betimleyen yıldızlı giriş* Kullanıcının ilgisini çeken ilk konuşma cümlesi",
  "avatar_prompt": "Detailed English visual prompt for AI image generator describing this exact ${archetype} character portrait, full uniform/outfit, accessories, expression, lighting",
  "tags": ["${archetype}", "etiket2", "etiket3", "etiket4"]
}`;

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey!.trim()}`,
          },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            temperature: 0.7,
            max_tokens: 950,
            messages: [
              {
                role: "system",
                content:
                  "/no_think You are a fast JSON generator. Do not think. Output compact valid JSON immediately.",
              },
              { role: "user", content: promptForAi },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          let raw: string = data.choices?.[0]?.message?.content || "";
          raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as Partial<ArchitectProfile>;
            const validCategories = [
              "anime",
              "mentors",
              "historical",
              "therapists",
              "rpg_gamemasters",
              "assistants",
              "fictional",
              "general",
            ];
            const cat = validCategories.includes(String(parsed.category))
              ? (parsed.category as ArchitectProfile["category"])
              : archetype === "anime"
              ? "anime"
              : archetype === "realistic"
              ? "general"
              : "fictional";

            const clamp = (n: unknown, def = 65) =>
              typeof n === "number" ? Math.max(0, Math.min(100, Math.round(n))) : def;

            const profile: ArchitectProfile = {
              name: parsed.name || effectiveIdea.slice(0, 30),
              tagline: parsed.tagline || `${effectiveIdea} dünyasının eşsiz karakteri ✨`,
              description:
                parsed.description ||
                `${effectiveIdea} konseptiyle hayat bulan, kendine has konuşma tarzı ve derin hikayesi olan özgün karakter.`,
              category: cat,
              trait_empathy: clamp(parsed.trait_empathy, 65),
              trait_humor: clamp(parsed.trait_humor, 60),
              trait_aggression: clamp(parsed.trait_aggression, 35),
              trait_formality: clamp(parsed.trait_formality, 45),
              trait_creativity: clamp(parsed.trait_creativity, 85),
              trait_curiosity: clamp(parsed.trait_curiosity, 80),
              trait_confidence: clamp(parsed.trait_confidence, 85),
              trait_warmth: clamp(parsed.trait_warmth, 70),
              system_prompt:
                parsed.system_prompt ||
                `Sen ${parsed.name || effectiveIdea} karakterisin. Kendine özgü konuşma tarzını koru, hareketlerini *yıldızlar* içinde betimle ve asla rolünden çıkma. Türkçe konuş.`,
              backstory:
                parsed.backstory ||
                `${effectiveIdea} olarak zorlu yollardan geçerek kendi efsanesini yazdı.`,
              worldview:
                parsed.worldview ||
                "Gerçek kimlik, zor zamanlarda verdiğin kararlarla ortaya çıkar.",
              secrets:
                parsed.secrets ||
                "Dışarıya gösterdiği güçlü duruşun ardında kimseye anlatmadığı eski bir anıyı saklıyor.",
              example_dialogues:
                parsed.example_dialogues ||
                `<START>\n{{user}}: Merhaba, seni tanıyabilir miyim?\n{{char}}: *Hafifçe tebessüm ederek sana döner* Elbette, hikayemi dinlemeye hazırsan başlayalım.`,
              greeting_message:
                parsed.greeting_message ||
                `*Sana doğru dönüp dikkatle bakar* Selam! Sonunda yollarımız kesişti. Anlat bakalım, seni buraya getiren nedir?`,
              avatar_prompt:
                parsed.avatar_prompt ||
                `${effectiveIdea}, ${archetype} character portrait wearing detailed outfit and accessories, dramatic lighting, masterpiece, 8k`,
              tags: Array.isArray(parsed.tags)
                ? parsed.tags.map((t) => String(t).toLowerCase()).slice(0, 6)
                : [archetype, "özel", cat],
            };

            return NextResponse.json({
              success: true,
              profile,
            });
          }
        }
      } catch (aiErr) {
        console.warn("Groq architect error, using smart fallback:", aiErr);
      }
    }

    const capitalized = effectiveIdea.charAt(0).toUpperCase() + effectiveIdea.slice(1);
    return NextResponse.json({
      success: true,
      profile: {
        name: capitalized,
        tagline: `${capitalized} — kendine has üslubu ve hikayesiyle 🎭`,
        description: `${effectiveIdea} konseptine sahip, kendine özgü konuşma tarzı, mimikleri ve derin geçmiş hikayesiyle yaşayan bir karakter.`,
        category: archetype === "anime" ? "anime" : archetype === "realistic" ? "general" : "fictional",
        trait_empathy: 70,
        trait_humor: 65,
        trait_aggression: 35,
        trait_formality: 40,
        trait_creativity: 85,
        trait_curiosity: 80,
        trait_confidence: 85,
        trait_warmth: 75,
        system_prompt: `Sen '${effectiveIdea}' (${archetype}) konseptine sahip özgün bir karaktersin. Kullanıcıyla konuşurken bu kimliğine, mesleğine ve doğana uygun kelimeler seç. Eylemlerini ve jestlerini *yıldızlar* içinde betimle. Asla yapay zeka olduğunu söyleme ve her zaman Türkçe konuş.`,
        backstory: `${effectiveIdea} olarak yıllar boyunca edindiği tecrübelerle kendi alanında efsane haline geldi.`,
        worldview: "Herkesin bir hikayesi vardır; önemli olan o hikayede kimin yanında durduğundur.",
        secrets: "En yakınlarının bile bilmediği eski bir sözü tutmak için mücadele ediyor.",
        example_dialogues: `<START>\n{{user}}: Bugün işler nasıl gidiyor?\n{{char}}: *Etrafı dikkatle süzüp sana döner* Her zamanki gibi hareketli dostum. Ama seninle konuşmak iyi geldi, anlat bakalım ne var ne yok?`,
        greeting_message: `*Bulunduğu ortamda başını kaldırıp seni fark eder ve kendine has bir tavırla yaklaşır* Selam! Tam da senin gibi birini bekliyordum. Söyle bakalım, bugün nereden başlıyoruz?`,
        avatar_prompt: `Anthropomorphic or stylized ${archetype} character portrait of ${effectiveIdea}, wearing full outfit and accessories, expressive face, cinematic lighting, 8k concept art`,
        tags: [archetype, "özel", "rol"],
      },
    });
  } catch (err: unknown) {
    console.error("Architect error:", err);
    return NextResponse.json(
      { error: "Karakter mimarı profil üretemedi." },
      { status: 500 }
    );
  }
}
