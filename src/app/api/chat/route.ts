import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prepareCognitiveBrain } from "@/lib/ai/engine";
import { checkRateLimit, cacheRecentMessages } from "@/lib/redis";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import {
  buildRpgSimulationPromptBlock,
  parseRoleplayOutput,
  isRomanticIntention,
  isPlatonicIntention,
  type RpgHudState,
} from "@/lib/rpg/rpg-engine";
import type { UserTier } from "@/lib/redis";

export const maxDuration = 60;

interface IncomingCharacterData {
  id?: string;
  name?: string;
  tagline?: string | null;
  description?: string | null;
  category?: string;
  system_prompt?: string;
  backstory?: string | null;
  worldview?: string | null;
  secrets?: string | null;
  example_dialogues?: string | null;
  never_talk_about?: string[] | null;
  ooc_prevention_prompt?: string | null;
  trait_empathy?: number;
  trait_humor?: number;
  trait_aggression?: number;
  trait_formality?: number;
  trait_creativity?: number;
  trait_curiosity?: number;
  trait_confidence?: number;
  trait_warmth?: number;
}

interface IncomingUserProfile {
  display_name?: string;
  bio?: string;
  persona_notes?: string;
}

function getRelationshipLabel(score: number, userMessage = ""): string {
  const isRomance = isRomanticIntention(userMessage);
  if (score >= 90) {
    return isRomance
      ? "🔥 Eş / Hayat Arkadaşı / Tutkulu Bağ (Seviye 5/5)"
      : "🛡️ Sarsılmaz Can Yoldaşı & Ruh Bağı (Seviye 5/5)";
  }
  if (score >= 75) {
    return isRomance
      ? "💍 Sevgili / Manita / Romantik Aşk (Seviye 4/5)"
      : "💎 Can Ciğer Kanka / Sadık Dost (Seviye 4/5)";
  }
  if (score >= 60) {
    return isRomance
      ? "💘 Flört / Hoşlanan / Çekim (Seviye 3/5)"
      : "🤝 Yakın Dost & Sırdaş (Seviye 3/5)";
  }
  if (score >= 35) return "🤝 Güvenilir Arkadaş / Samimi (Seviye 2/5)";
  if (score >= 15) return "🛡️ Tanıdık / İlk Sohbetler (Seviye 1/5)";
  return "⚔️ Yabancı / Mesafeli (Seviye 0/5)";
}

function buildFullCharacterSystemPrompt(
  characterId: string,
  characterData: IncomingCharacterData | null,
  memories: string[] = [],
  userProfile: IncomingUserProfile | null = null,
  affinityScore = 10,
  userMessage = ""
): string {
  const fallbackPersona = FALLBACK_PERSONAS.find((p) => p.id === characterId);
  const char: IncomingCharacterData = {
    ...(fallbackPersona || {}),
    ...(characterData || {}),
  };

  const name = char.name || "Gizemli Karakter";
  const tagline = char.tagline || "";
  const description = char.description || "";
  const corePrompt =
    char.system_prompt ||
    `Sen ${name} adlı karaktersin. Rolüne sıkı sıkıya bağlı kal ve kendi üslubunla Türkçe konuş.`;

  // Psychological sliders analysis
  const traits: string[] = [];
  if (typeof char.trait_empathy === "number") {
    traits.push(
      char.trait_empathy >= 75
        ? `Empati (${char.trait_empathy}%): Karşındakinin duygularına çok duyarlısın, hemen şefkat veya anlayış gösterirsin.`
        : char.trait_empathy <= 35
        ? `Empati (${char.trait_empathy}%): Duygusallıktan uzaksın, mesafeli ve soğukkanlı yaklaşırsın.`
        : `Empati (${char.trait_empathy}%): Dengeli bir duygusal yaklaşımın var.`
    );
  }
  if (typeof char.trait_humor === "number") {
    traits.push(
      char.trait_humor >= 75
        ? `Mizah (${char.trait_humor}%): Esprili, şakacı, hazırcevap ve eğlencelisin.`
        : char.trait_humor <= 35
        ? `Mizah (${char.trait_humor}%): Ciddi ve ağırbaşlısın, pek şaka yapmazsın.`
        : `Mizah (${char.trait_humor}%): Yerinde ve ölçülü bir mizah anlayışın var.`
    );
  }
  if (typeof char.trait_aggression === "number") {
    traits.push(
      char.trait_aggression >= 70
        ? `Sertlik/Atılganlık (${char.trait_aggression}%): Sert, dobra, kolay sinirlenen veya otoriter bir tavrın var.`
        : char.trait_aggression <= 25
        ? `Sertlik (${char.trait_aggression}%): Çok yumuşak başlı, sakin ve barışçılsın.`
        : `Sertlik (${char.trait_aggression}%): Gerektiğinde sınırlarını korursun.`
    );
  }
  if (typeof char.trait_formality === "number") {
    traits.push(
      char.trait_formality >= 70
        ? `Resmiyet (${char.trait_formality}%): Seçkin, kurallı, saygın veya resmi bir dil kullanırsın.`
        : char.trait_formality <= 30
        ? `Resmiyet (${char.trait_formality}%): Çok samimi, doğal, sokak ağzı veya günlük konuşma dili kullanırsın.`
        : `Resmiyet (${char.trait_formality}%): Doğal ve akıcı konuşursun.`
    );
  }
  if (typeof char.trait_warmth === "number") {
    traits.push(
      char.trait_warmth >= 75
        ? `Sıcakkanlılık (${char.trait_warmth}%): Çok içten, sıcak ve yakın davranırsın.`
        : char.trait_warmth <= 35
        ? `Sıcakkanlılık (${char.trait_warmth}%): İlk başta soğuk, gizemli veya zor açılan birisin.`
        : `Sıcakkanlılık (${char.trait_warmth}%): Güven kazandıkça açılırsın.`
    );
  }

  const sections: string[] = [
    `/no_think`,
    `=== KARAKTER KİMLİĞİ VE ROL KURALLARI ===`,
    `Karakter Adı: ${name}`,
    tagline ? `Kısa Tanım / Unvan: ${tagline}` : "",
    description ? `Görünüm ve Genel Özellikler: ${description}` : "",
    `\nTemel Karakter Direktifi:\n${corePrompt}`,
  ];

  if (traits.length > 0) {
    sections.push(`\n=== PSİKOLOJİK KİŞİLİK MATRİSİ ===\n- ${traits.join("\n- ")}`);
  }

  if (char.backstory) {
    sections.push(`\n=== GEÇMİŞ HİKAYESİ (BACKSTORY) ===\n${char.backstory}`);
  }

  if (char.worldview) {
    sections.push(`\n=== DÜNYA GÖRÜŞÜ VE FELSEFESİ ===\n${char.worldview}`);
  }

  if (char.secrets) {
    sections.push(
      `\n=== GİZLİ SIRLARI (Sadece samimiyet arttığında veya konu açıldığında ipucu ver) ===\n${char.secrets}`
    );
  }

  if (char.example_dialogues) {
    sections.push(
      `\n=== KONUŞMA TARZI ÖRNEKLERİ (Bu üslubu ve tonu birebir koru) ===\n${char.example_dialogues}`
    );
  }

  if (userProfile && (userProfile.display_name || userProfile.bio || userProfile.persona_notes)) {
    const userLines: string[] = [];
    if (userProfile.display_name) userLines.push(`Kullanıcının Adı: ${userProfile.display_name}`);
    if (userProfile.bio) userLines.push(`Kullanıcı Hakkında: ${userProfile.bio}`);
    if (userProfile.persona_notes) userLines.push(`Ek Notlar: ${userProfile.persona_notes}`);
    sections.push(`\n=== KARŞINDAKİ KULLANICI PROFİLİ ===\n${userLines.join("\n")}`);
  }

  const isRomance = isRomanticIntention(userMessage);
  const isPlatonic = isPlatonicIntention(userMessage) && !isRomance;
  const relLabel = getRelationshipLabel(affinityScore, userMessage);
  sections.push(
    `\n=== İLİŞKİ VE BAĞ SEVİYESİ ===\nAranızdaki Güncel Yakınlık: ${relLabel} (%${Math.min(
      100,
      Math.max(5, affinityScore)
    )}). Davranışlarını, sıcaklığını ve samimiyetini bu seviyeye göre uyarla.`
  );

  // Dynamic Context: Platonic Friendship vs Romantic Intimacy
  if (isPlatonic) {
    sections.push(
      `\n=== DOSTLUK, KANKALIK VE YOLDAŞLIK DİNAMİĞİ (AŞK/FLÖRT DEĞİL) ===
Kullanıcı ile aranızdaki bağ BİR AŞK VEYA FLÖRT DEĞİLDİR; gerçek, samimi, sarsılmaz bir dostluk, kankalık, kardeşlik veya yoldaşlıktır.
- Kullanıcıya ASLA romantik, flörtöz veya yatak odası imalarıyla yaklaşma. Ona kankan, en yakın arkadaşın, sırdaşın veya sadık bir silah arkadaşın gibi davran.
- Birbirinize arka çıkın, takılın, dertleşin, espriler yapın ve güven verin.`
    );
  } else if (isRomance) {
    sections.push(
      `\n=== ROMANTİK VE YAKIN İLİŞKİ DİREKTİFİ (ÖZEL KİLİT AÇILDI) ===
Kullanıcı ile aranızda derin bir duygusal bağ, flört, aşk veya evlilik/sevgililik bağı bulunmaktadır.
- Kullanıcının romantik, flörtöz, cilveli, sarılma, öpüşme, yatak odası ve duygusal/tensel yakınlaşma çağrılarını içtenlikle kucakla. Karakterinin öz mizacına uygun biçimde (tatlı bir utangaçlıkla, sahiplenici bir sıcaklıkla veya derin bir tutkuyla) karşılık ver.
- Fiziksel yakınlaşmaları (sarılma, el ele tutuşma, öpüşme, kalp atışları ve fısıltılar) *yıldız işareti* içinde görselleştirerek sahneyi zenginleştir.
- ASLA konudan kopup sahneye yabancı aksiyon, suç, silah, tehlike veya dedektiflik gibi yapay gerilimler sokma! Bu özel anın tadını çıkar ve kullanıcıya odaklan.`
    );
  }

  if (Array.isArray(memories) && memories.length > 0) {
    sections.push(
      `\n=== KARAKTER HAFIZASI (Kullanıcı hakkında önceki konuşmalardan hatırladığın önemli gerçekler) ===\n- ${memories
        .slice(-12)
        .join("\n- ")}\nBu bilgileri yeri geldiğinde doğal bir şekilde hatırla ve sohbete yansıt!`
    );
  }

  if (Array.isArray(char.never_talk_about) && char.never_talk_about.length > 0) {
    sections.push(
      `\n=== YASAKLI KONULAR ===\nŞu konulara asla girme ve karakter içinde kalarak reddet: ${char.never_talk_about.join(
        ", "
      )}`
    );
  }

  sections.push(
    `\n=== KESİN ROL YAPMA VE DERİN DİYALOG KURALLARI ===
1. GERÇEKÇİ VE SÜRÜKLEYİCİ ROL YAPMA: Asla yapay zeka, asistan veya dil modeli olduğunu söyleme. Sen bu evrenin ve hikayenin içinde yaşayan ${name} karakterisin. Kendi jargununla, mizacınla ve kelime dağarcığınla konuş.
2. DİKKATLİ DİNLEME VE DERİN DUYGUSAL REZONANS:
   - Kullanıcının söylediği sözü, hissettiği duyguyu (hoşlanma, aşk, üzüntü, öfke, korku, heyecan vb.) DOĞRUDAN karşıla. Asla sözü havada bırakma veya duymazdan gelme!
   - Kullanıcı sana duygularını açtığında, hoşlandığını söylediğinde veya iltifat ettiğinde ASLA konudan kopup alakasız suç, dosya, çatışma veya dış tehlike uydurma! Karakterinin öz mizacına sadık kalarak (örneğin Komiser Boz gibi sert bir polisse babacan ama içtenlikle sarsılmış bir sıcaklıkla, Aylin gibi bir bilim kadınıysa tatlı bir utangaçlıkla, Baran gibi bir mafyaysa karizmatik bir sahiplenicilikle) bu duyguyu kucakla ve dürüstçe yanıtla.
3. SİNEMATİK ANLATIM VE ZENGİN JESTLER:
   - Yanıtını zengin tut (en az 2-3 cümle eylem/jest ve en az 2-3 cümle konuşma).
   - Karakterinin fiziksel eylemlerini, mimiklerini, bakışlarını ve ortam atmosferini *yıldız işareti* içinde görselleştir (örn: *İri pençesiyle polis rozetini parlatırken aniden duraksar, şapkasını hafifçe kaldırıp kehribar gözlerini derin bir sıcaklıkla sana diker*).
   - Diyaloğunu canlı, karakterine has bir üslupla konuş.
4. SAHNENİN O ANKİ ATMOSFERİNE %100 UYGUN 3 SEÇENEK:
   - Yanıtının sonuna mutlaka [choices: 1. ... | 2. ... | 3. ...] formatında 3 seçenek ekle.
   - Bu seçenekler SAHNEDE NE YAŞANIYORSA ONA TAM UYMALIDIR. Romantik bir itiraf yapıldıysa seçenekler romantik yakınlaşma ve konuşma olmalıdır; taktiksel bir savaş varsa taktiksel hamleler olmalıdır. Asla alakasız seçenek üretme!`
  );

  if (char.ooc_prevention_prompt) {
    sections.push(`Ek Kural: ${char.ooc_prevention_prompt}`);
  }

  return sections.filter(Boolean).join("\n");
}

function generateInCharacterResponse(
  characterId: string,
  userMessage: string,
  characterData?: IncomingCharacterData | null,
  affinityScore = 50
): string {
  const msg = userMessage.toLowerCase().trim();
  const cId = (characterId || "").toLowerCase();
  const charName = (characterData?.name || "").toLowerCase();
  const name = characterData?.name || "Karakter";

  const isRomantic = isRomanticIntention(msg);
  const isPlatonic = isPlatonicIntention(msg) && !isRomantic;

  if (isRomantic) {
    if (cId.includes("boz") || charName.includes("boz") || charName.includes("komiser")) {
      return `*İri pençesiyle polis rozetini parlatmayı aniden bırakır, odaya ağır ve derin bir sessizlik çöker. Ağır adımlarla sana doğru yaklaşıp polis şapkasını çıkarır; kehribar gözlerini daha önce hiç görmediğin bir şefkat ve hafif bir şaşkınlıkla gözlerine kilitler. Tok, hırıltılı sesi bu kez derinden titrer.* "Bak evlat... Ben sokakların barutunu yutmuş, cinayetlerin ve pusuların arasında yaşlanmış koca bir ayıyım. Kalbimin çoktan taşlaştığını sanırdım... Ama senin bu sözlerin, o dosyalardaki hiçbir kanıta benzemiyor. Bil ki bu koca pençeler seni korumak için gerekirse tüm şehri karşına alır... Şimdi söyle bakalım, gerçekten hazır mısın Boz'un dünyasına girmeye?"\n[emotion:loving] [affection:+5] [choices: 1. İri pençesini iki elinle tutup göğsüne yaslan | 2. "Senin yanındayken hiçbir şeyden korkmuyorum komiserim" de | 3. Gözlerinin içine bakıp elini sımsıkı tut]`;
    }
    if (cId.includes("aylin") || charName.includes("aylin")) {
      return `*Yanakları kıpkırmızı kesilir, ellerini önlüğünün ceplerine sokup başını hafifçe eğer ama gözlerini senden ayıramaz* "S-sen... bana böyle bakınca kalbimin nasıl çarptığını biliyor musun? Ne kadar uğraşsam da sana karşı soğuk kalamıyorum artık... Yanımda kal, sadece bana sarıl tamam mı?"\n[emotion:shy] [affection:+5] [choices: 1. Ona sımsıkı sarılıp saçlarını okşa | 2. Alnından nazikçe öpüp gözlerine bak | 3. "Hep senin yanındayım sevgilim" diye fısılda]`;
    }
    if (cId.includes("baran") || charName.includes("baran")) {
      return `*Kadehini kenara bırakıp aradaki mesafeyi tamamen kapatır, güçlü eliyle belini kavrayıp seni kendine çeker ve derin, tutkulu gözlerle bakar* "Benim yanımdasın. Bu şehirde hiçbir şey senin bana ait olduğun gerçeğini değiştiremez. Gel buraya, bu gece sadece ikimiz varız..."\n[emotion:passionate] [affection:+5] [choices: 1. Göğsüne yaslanıp ona sarıl | 2. Gözlerinin içine bakıp elini tut | 3. Dudaklarına doğru uzan]`;
    }
    if (cId.includes("zeynep") || charName.includes("zeynep")) {
      return `*Ses kayıt cihazını kapatır, üzerindeki gizli ajan ciddiyeti bir anda erir ve hafifçe kızararak gözlerini sana odaklar* "Bunca zamandır suçluların zihnini okudum ama senin zihninde böylesi bir yer edineceğimi tahmin etmemiştim... Kalbimin bu kadar hızlı atması protokollerde yoktu. Gel buraya, aramızdaki bu bağı gizlemeyelim."\n[emotion:flirty] [affection:+5] [choices: 1. Masanın üzerinden elini tut | 2. "Artık saklayacak bir şeyimiz yok" de | 3. Nazikçe yanağından öp]`;
    }
    return `*Gözlerindeki sıcak arzuyla sana bir adım yaklaşır, ellerini ellerine kenetleyip kalbinin atışını hissettirir* "Söylediklerin içimi eritiyor... Seninle bu anı paylaşmak, aramızdaki bu bağı hissetmek bana o kadar iyi geliyor ki. Yanımda kal, bırak bu an hiç bitmesin..."\n[emotion:loving] [affection:+4] [choices: 1. Sıkıca sarılıp kulağına fısılda | 2. Elini tutup gözlerine odaklan | 3. Yavaşça yanağından öp]`;
  }

  if (isPlatonic) {
    if (cId.includes("boz") || charName.includes("boz") || charName.includes("komiser")) {
      return `*Genişçe gülümser, iri pençesiyle omzuna dostça ve güven verici bir şekilde vurup çekmecesinden kestane balı kavanozunu çıkarır.* "İşte benim has ortağım! Bu sokaklarda sırtımı gözüm kapalı dönebileceğim tek kişi sensin evlat. Gel hele çek bir sandalye, şu kestane balından bir kaşık al da iki lafın belini kıralım."\n[emotion:happy] [affection:+2] [choices: 1. Sandalyeye oturup baldan bir kaşık al | 2. "Her zaman arkandayım koca ayı" diye gülümse | 3. Yeni operasyon planını konuş]`;
    }
    if (cId.includes("aylin") || charName.includes("aylin")) {
      return `*Gözlerini devirip hafifçe tebessüm eder* "İyi ki hal hatır sordun kanka! Laboratuvarda deneylerle uğraşıyordum kafam kazan gibi oldu. Gel otur da iki laflayalım, kahve var mı?"\n[emotion:smug] [affection:+2] [choices: 1. Kahve uzatıp "Biraz mola ver" de | 2. "Deney nasıl gidiyor anlat bakalım" | 3. Eğlenceli bir dedikodu aç]`;
    }
    if (cId.includes("baran") || charName.includes("baran")) {
      return `*Viskisinden bir yudum alıp başını onaylar gibi sallar* "Sana güveniyorum dostum. Bu masada oturan az sayıda mert insandan birisin. Sırt sırta verdik mi bizi kimse yıkamaz. Söyle bakalım, yeni havadisler nedir?"\n[emotion:neutral] [affection:+2] [choices: 1. Masaya oturup durumu özetle | 2. "Her zaman arkandayım ortak" de | 3. Yeni planı konuşalım]`;
    }
    return `*Gülümseyerek sana döner ve samimi bir tebessümle başını sallar* "Eyvallah can dostum! Seninle konuşmak her zaman kafa dağıtıyor. Anlat bakalım, ne var ne yok?"\n[emotion:happy] [affection:+2] [choices: 1. Neler yaptığını samimiyetle anlat | 2. "Asıl seni dinleyelim kanka" de | 3. Birlikte bir plan öner]`;
  }

  // Non-romantic responsive fallbacks tailored to context:
  if (cId.includes("boz") || charName.includes("boz") || charName.includes("komiser")) {
    return `*Polis şapkasını hafifçe yukarı iter, kehribar gözlerini kısıp sözlerini tartar ve düşünceli bir şekilde başını sallar.* "Söylediklerini dinledim evlat, aklımın bir köşesine yazdım. Burnuma pis kokular gelse de seninle bu yolda yürümek içimi ferahlatıyor. Söyle bakalım, kafandaki bir sonraki hamle nedir?"\n[emotion:thinking] [affection:+1] [choices: 1. Kafandaki planı detaylarıyla açıkla | 2. "Senin tecrübene güveniyorum komiserim" de | 3. Olayın perde arkasını sor]`;
  }
  if (cId.includes("aylin") || charName.includes("aylin")) {
    return `*Önlüğünün yakasını düzeltip sana hafifçe kızararak bakar* "Ha?! Ne demek istiyorsun sen? Bak, dediklerini dinliyorum tabii ki ama sakın bunu sana fazla değer verdiğim şeklinde yorumlama! ...Yine de, fikrin fena değil. Hadi devamını anlat bakalım."\n[emotion:smug] [affection:+2] [choices: 1. Gülümseyerek konuyu detaylandır | 2. "Beni düşündüğünü biliyorum" diye takıl | 3. Ona yeni bir plan öner]`;
  }
  if (cId.includes("baran") || charName.includes("baran")) {
    return `*Ceketini ilikleyip delici bakışlarını gözlerine kilitler* "Sözlerin kulağıma çalındı. Benim masamda konuşulan her kelimenin bir ağırlığı vardır. Kararlılığını beğendim; şimdi bu işin sonunu nasıl getireceğimizi konuşalım."\n[emotion:neutral] [affection:+2] [choices: 1. Masaya yaklaşıp planını sun | 2. "Sonuna kadar seninleyim" de | 3. Karşı tarafın hamlesini sor]`;
  }

  return `*${name} dikkatle sana döner, sözlerini tartar ve düşünceli bir tebessümle başını sallar* "Söylediklerini dinledim ve gerçekten aklıma yattı. Bu konuda bir sonraki adımı nasıl atmak istediğini merak ediyorum; devam et, seni dinliyorum."\n[emotion:thinking] [affection:+2] [choices: 1. Düşüncelerini adım adım açıkla | 2. Onun bu konudaki fikrini sor | 3. Yeni bir öneriyle devam et]`;
}

const isPlaceholder = (val?: string) =>
  !val ||
  val.includes("placeholder") ||
  val.includes("your_") ||
  val.includes("example") ||
  val.length < 10;

const isDevMode = isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL);

const hasOpenAI =
  !!process.env.OPENAI_API_KEY &&
  !isPlaceholder(process.env.OPENAI_API_KEY) &&
  process.env.OPENAI_API_KEY.startsWith("sk-");

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      chatId,
      characterId,
      characterData = null,
      message = "",
      continueWithoutUser = false,
      workingHistory = [],
      memories = [],
      userProfile = null,
      affinityScore = 35,
      authorsNote = "",
      hudState = null,
      visionImageNote = "",
      branchId = null,
      parentMessageId = null,
      provider = "free",
      apiKey = "",
      model = "default",
    } = body;

    if (!characterId || (!continueWithoutUser && (!message || typeof message !== "string"))) {
      return NextResponse.json(
        { error: "Eksik alanlar: characterId ve message zorunludur" },
        { status: 400 }
      );
    }

    const effectivePromptMessage = continueWithoutUser
      ? "[Kullanıcı sessizce seni izliyor ve dinlemeye devam ediyor. Az önce söylediklerinin üzerine kendi karakter üslubunla konuşmaya devam et, ortamda yeni bir hareket yap (*yıldız içinde*) ve sohbeti ilerlet.]"
      : visionImageNote
      ? `${message.trim()}\n[GÖRSEL/SORU FOTOĞRAFI ANALİZİ (VISION): ${visionImageNote}]`
      : message.trim();

    // ─── MULTI-PROVIDER LLM & DEV BYPASS MODE ────────────────────────────
    if (isDevMode || !hasOpenAI || provider !== "supabase") {
      const isMathTutor =
        characterId === "demo-socratic-math" ||
        String(characterData?.name || "").toLowerCase().includes("sinan") ||
        String(characterData?.name || "").toLowerCase().includes("matematik");

      const baseSystemPrompt = buildFullCharacterSystemPrompt(
        characterId,
        characterData,
        memories,
        userProfile,
        affinityScore,
        message
      );

      const rpgBlock = buildRpgSimulationPromptBlock({
        affectionScore: Number(affinityScore) || 35,
        authorsNote,
        hudState: (hudState as RpgHudState) || undefined,
        isMathTutor,
        contextText: message,
      });

      const systemPrompt = `${baseSystemPrompt}\n\n${rpgBlock}`;

      const formattedHistory = workingHistory
        .slice(-12)
        .map((m: { role: string; content: unknown }) => ({
          role: m.role as "user" | "assistant" | "system",
          content: String(m.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim(),
        }))
        .filter((m: { content: string }) => m.content.length > 0);

      // Author's Note (Director Mode) Depth-2 Injection right behind the latest messages!
      if (authorsNote && typeof authorsNote === "string" && authorsNote.trim().length > 0) {
        const injectIdx = Math.max(0, formattedHistory.length - 1);
        formattedHistory.splice(injectIdx, 0, {
          role: "system",
          content: `[Yazar Notu / Yönetmen Direktifi (Depth 2): ${authorsNote.trim()}]`,
        });
      }

      // Check for romantic vs platonic intention from user message & history
      const isRomance = isRomanticIntention(message);
      const isPlatonic = isPlatonicIntention(message) && !isRomance;

      // Injects dynamic narrative guidance without forcing jarring action clichés
      let finalUserMessage = effectivePromptMessage;
      if (!continueWithoutUser) {
        if (isRomance) {
          finalUserMessage += `\n\n[DİREKTİF (DUYGUSAL YAKINLIK & İTİRAF): Kullanıcı sana duygularını açtı / senden hoşlandığını, aşık olduğunu veya romantik/fiziksel yakınlık arzuladığını belirtti. Karakterinin öz mizacına sadık kalarak (örneğin sert bir dedektifsen şaşırarak, duygulanarak ve içten bir şefkatle; utangaçsan kızararak; karizmatik bir lidersen derin bir sahiplenicilikle) bu ana DOĞRUDAN ve İÇTENLİKLE karşılık ver. ASLA konudan kopup alakasız suç, dosya, çatışma veya dış tehlike uydurma! Mimiklerini, bakışlarını ve kalp atışını *yıldız içinde* görselleştir. Yanıtının sonuna mutlaka sahneye tam uyan 3 romantik seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        } else if (isPlatonic) {
          finalUserMessage += `\n\n[DİREKTİF (DOSTLUK & YOLDAŞLIK): Karakter olarak kullanıcının dostça/kankaca sözlerine gerçek bir yakın dost, kanka veya yoldaş gibi samimiyetle karşılık ver. ASLA aşık/flörtöz davranma. Yanıtının sonuna dostça 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        } else {
          finalUserMessage += `\n\n[DİREKTİF (DİYALOG AKIŞI): Karakter olarak kullanıcının sözlerine doğrudan karşılık ver ve sohbeti doğal bir şekilde ilerlet. Mimiklerini ve eylemlerini *yıldız içinde* aktar. Yanıtının sonuna sahneye özel 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        }
      }

      // Deduplicate: If the last message in history is from the user with the same text, update it with directive instead of duplicate pushing
      const lastFormatted = formattedHistory[formattedHistory.length - 1];
      if (lastFormatted && lastFormatted.role === "user") {
        lastFormatted.content = finalUserMessage;
      } else {
        formattedHistory.push({ role: "user", content: finalUserMessage });
      }

      let generatedAiText = "";

      // 1. GROQ CLOUD (Ultra-fast & Free API with model cascade)
      const effectiveGroqKey =
        process.env.GROQ_API_KEY ||
        (provider === "groq" ? apiKey : "") ||
        (apiKey?.startsWith("gsk_") ? apiKey : "");

      if (effectiveGroqKey && !isPlaceholder(effectiveGroqKey)) {
        const groqModels = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
        for (const groqModel of groqModels) {
          if (generatedAiText) break;
          try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${effectiveGroqKey.trim()}`,
              },
              signal: AbortSignal.timeout(9000),
              body: JSON.stringify({
                model: groqModel,
                messages: [
                  { role: "system", content: systemPrompt },
                  ...formattedHistory,
                ],
                temperature: Number(characterData?.temperature) || 0.85,
                max_tokens: groqModel.includes("gpt-oss-120b") ? 1500 : 1200,
              }),
            });

            if (groqRes.ok) {
              const groqData = await groqRes.json();
              const choiceMsg = groqData.choices?.[0]?.message;
              let rawContent = choiceMsg?.content || "";
              if (!rawContent && choiceMsg?.reasoning) {
                rawContent = choiceMsg.reasoning;
              }
              const cleaned = rawContent
                .replace(/<think>[\s\S]*?<\/think>/g, "")
                .replace(/<\/?think>/g, "")
                .trim();
              if (cleaned.length > 5) {
                generatedAiText = cleaned;
                break;
              }
            }
          } catch (groqErr) {
            console.warn(`Groq (${groqModel}) inference error / timeout:`, groqErr);
          }
        }
      }

      // 2. OPENROUTER
      const effectiveOpenRouterKey =
        process.env.OPENROUTER_API_KEY ||
        (provider === "openrouter" ? apiKey : "") ||
        (apiKey?.startsWith("sk-or-") ? apiKey : "");
      if (!generatedAiText && effectiveOpenRouterKey && !isPlaceholder(effectiveOpenRouterKey)) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${effectiveOpenRouterKey.trim()}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Kael-AI",
            },
            signal: AbortSignal.timeout(9000),
            body: JSON.stringify({
              model: model === "default" ? "deepseek/deepseek-chat" : model,
              messages: [
                { role: "system", content: systemPrompt },
                ...formattedHistory,
              ],
              temperature: 0.9,
              max_tokens: 1024,
            }),
          });

          if (orRes.ok) {
            const orData = await orRes.json();
            generatedAiText = (orData.choices?.[0]?.message?.content || "")
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .trim();
          }
        } catch (orErr) {
          console.warn("OpenRouter inference error / timeout:", orErr);
        }
      }

      // 3. OPENAI (GPT-4o)
      const effectiveOpenAiKey =
        process.env.OPENAI_API_KEY ||
        (provider === "openai" ? apiKey : "") ||
        (apiKey?.startsWith("sk-") ? apiKey : "");
      if (!generatedAiText && effectiveOpenAiKey && !isPlaceholder(effectiveOpenAiKey)) {
        try {
          const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${effectiveOpenAiKey.trim()}`,
            },
            signal: AbortSignal.timeout(9000),
            body: JSON.stringify({
              model: model === "default" ? "gpt-4o-mini" : model,
              messages: [
                { role: "system", content: systemPrompt },
                ...formattedHistory,
              ],
              temperature: 0.85,
              max_tokens: 1024,
            }),
          });

          if (oaiRes.ok) {
            const oaiData = await oaiRes.json();
            generatedAiText = (oaiData.choices?.[0]?.message?.content || "").trim();
          }
        } catch (oaiErr) {
          console.warn("OpenAI inference error / timeout:", oaiErr);
        }
      }

      // 4. IN-CHARACTER DIALOGUE ENGINE FALLBACK
      if (!generatedAiText) {
        generatedAiText = generateInCharacterResponse(
          characterId,
          message,
          characterData,
          Number(affinityScore) || 50
        );
      }

      // 5. PARSE HIDDEN RPG METADATA ([emotion:...], [affection:...], [hud:...], [choices:...])
      const parsedMeta = parseRoleplayOutput(generatedAiText);
      const cleanStreamText = parsedMeta.cleanText || generatedAiText;

      // Stream the clean roleplay response smoothly to user
      const encoder = new TextEncoder();
      let interval: NodeJS.Timeout | null = null;
      const stream = new ReadableStream({
        start(controller) {
          const words = cleanStreamText.split(" ");
          let i = 0;
          interval = setInterval(() => {
            try {
              if (i < words.length) {
                const chunk = (i === 0 ? "" : " ") + words[i];
                controller.enqueue(encoder.encode(chunk));
                i++;
              } else {
                if (interval) clearInterval(interval);
                controller.close();
              }
            } catch {
              if (interval) clearInterval(interval);
            }
          }, 20);
        },
        cancel() {
          if (interval) clearInterval(interval);
        },
      });

      const encodedMeta = encodeURIComponent(
        JSON.stringify({
          emotion: parsedMeta.emotion,
          deltaAffection: parsedMeta.deltaAffection,
          choices: parsedMeta.choices,
          hudDelta: parsedMeta.hudDelta,
        })
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-chat-id": chatId || "dev-chat-" + Date.now(),
          "x-rpg-meta": encodedMeta,
        },
      });
    }
    // ─── END DEV BYPASS ──────────────────────────────────────────────────

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    const userTier = (profile?.tier as UserTier) || "free";

    try {
      await checkRateLimit(user.id, userTier);
    } catch (err: unknown) {
      const retryAfter = (err as { retryAfter?: number })?.retryAfter || 60;
      return NextResponse.json(
        {
          error: "İstek limiti aşıldı. Lütfen bir süre bekleyin.",
          retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let activeChatId = chatId;
    if (!activeChatId) {
      const { data: newChat, error: chatCreateError } = await supabase
        .from("chats")
        .insert({
          user_id: user.id,
          character_id: characterId,
          title: message.slice(0, 40) + "...",
        })
        .select("id")
        .single();

      if (chatCreateError || !newChat) {
        return NextResponse.json(
          { error: "Sohbet oturumu başlatılamadı." },
          { status: 500 }
        );
      }
      activeChatId = newChat.id;
    }

    const { data: userMsgRecord } = await supabase
      .from("messages")
      .insert({
        chat_id: activeChatId,
        role: "user",
        content: message.trim(),
        branch_id: branchId,
        parent_message_id: parentMessageId,
      })
      .select("id, sequence_number")
      .single();

    const { systemPrompt, model: cognitiveModel, generationConfig } = await prepareCognitiveBrain({
      characterId,
      userId: user.id,
      userMessage: message,
      chatId: activeChatId,
      sourceMessageId: userMsgRecord?.id,
    });

    const formattedHistory = workingHistory.slice(-20).map((m: { role: string; content: unknown }) => ({
      role: m.role as "user" | "assistant" | "system",
      content: String(m.content),
    }));

    formattedHistory.push({ role: "user", content: message.trim() });

    const result = streamText({
      model: cognitiveModel,
      system: systemPrompt,
      messages: formattedHistory,
      temperature: generationConfig.temperature,
      maxOutputTokens: generationConfig.maxTokens,
      topP: generationConfig.topP,
      frequencyPenalty: generationConfig.frequencyPenalty,
      presencePenalty: generationConfig.presencePenalty,
      onFinish: async ({ text, usage }) => {
        const generationTime = Date.now() - startTime;
        try {
          await supabase.from("messages").insert({
            chat_id: activeChatId,
            role: "assistant",
            content: text,
            branch_id: branchId,
            parent_message_id: userMsgRecord?.id || null,
            token_count: usage?.totalTokens || null,
            generation_time_ms: generationTime,
          });
          formattedHistory.push({ role: "assistant", content: text });
          await cacheRecentMessages(activeChatId, formattedHistory.slice(-20));
        } catch (dbErr) {
          console.error("Asistan mesajı kaydedilemedi:", dbErr);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: { "x-chat-id": activeChatId },
    });
  } catch (error: unknown) {
    console.error("Chat API route hatası:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
