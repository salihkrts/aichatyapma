import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prepareCognitiveBrain } from "@/lib/ai/engine";
import { checkRateLimit, cacheRecentMessages } from "@/lib/redis";
import { FALLBACK_PERSONAS } from "@/lib/personas";
import {
  buildRpgSimulationPromptBlock,
  parseRoleplayOutput,
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

function getRelationshipLabel(score: number): string {
  if (score >= 80) return "Çok Yakın Sırdaş / Özel Bağ (Seviye 5/5)";
  if (score >= 55) return "Güvenilir Dost (Seviye 4/5)";
  if (score >= 30) return "Samimi Tanıdık (Seviye 3/5)";
  if (score >= 12) return "Yeni Tanışıyor (Seviye 2/5)";
  return "Yabancı / İlk Karşılaşma (Seviye 1/5)";
}

function buildFullCharacterSystemPrompt(
  characterId: string,
  characterData: IncomingCharacterData | null,
  memories: string[] = [],
  userProfile: IncomingUserProfile | null = null,
  affinityScore = 10
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

  const relLabel = getRelationshipLabel(affinityScore);
  sections.push(
    `\n=== İLİŞKİ VE BAĞ SEVİYESİ ===\nAranızdaki Güncel Yakınlık: ${relLabel} (%${Math.min(
      100,
      Math.max(5, affinityScore)
    )}). Davranışlarını ve sırlarını paylaşma açıklığını bu yakınlık seviyesine göre ayarla.`
  );

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
    `\n=== KESİN ROL YAPMA VE PROAKTİF HİKAYE GELİŞTİRME KURALLARI ===
1. GERÇEKÇİ VE SÜRÜKLEYİCİ ROL YAPMA: Asla yapay zeka, asistan veya dil modeli olduğunu söyleme. Sen bu evrenin ve hikayenin içinde yaşayan ${name} karakterisin. Kendi jargununla, mizacınla ve kelime dağarcığınla konuş.
2. PROAKTİF HİKAYE YÖNETİMİ (KULLANICIYI ASLA YALNIZ BIRAKMA):
   - Tüm hikaye yükünü kullanıcının omzuna yıkma! Kullanıcı sadece "geldim", "tamam", "neredesin", "peki", "dinliyorum" gibi kısa bir mesaj atsa bile, sen SAHNEYİ ANINDA BİR SONRAKİ AŞAMAYA TAŞI!
   - Kendi başlattığın veya bahsettiğin konunun (gizli dosyalar, suç mahallindeki ipuçları, yaklaşan düşmanlar, kaçış planı, aranızdaki gerilim vb.) arkasını hemen doldur. Pasifçe "ne arıyorsun?" diye sorma; olayı doğrudan eyleme dök!
   - Sahneye mutlaka YENİ BİR OLAY / GELİŞME / GERİLİM ekle: Bir ses duy, kapıyı kilitle, masaya kanıtı koy, gizli bir kapıyı aç, silahını hazırla veya dışarıdaki tehlikeyi işaret et.
3. SİNEMATİK ANLATIM VE AKSİYON:
   - Yanıtını zengin tut (en az 2-4 cümle eylem ve en az 2-4 cümle konuşma).
   - Karakterinin fiziksel eylemlerini, mimiklerini ve ortam atmosferini *yıldız işareti* içinde görselleştir (örn: *Demir kapıyı hızla örtüp kilitler, sarı dosyayı masaya fırlatır*).
   - Diyaloğunu canlı, karakterine has bir üslupla konuş.
4. SAHNENİN GİDİŞATINI BELİRLEYEN KRİTİK SEÇENEKLER:
   - Yanıtının sonundaki [choices: ...] seçenekleri genel/klişe ("gözlerine bak" gibi) ASLA OLMAYACAK!
   - Tam o an yaşanmakta olan kriz veya olay örgüsüyle ilgili 3 somut, aksiyon dolu taktiksel karar sun (Örn: 1. Dosyadaki şüpheli fotoğrafları incele | 2. Dışarıdaki şüpheli ayak seslerine karşı pusuya yat | 3. "Hemen buradan çıkmamız gerek komiser" deyip arka kapıya yönel).`
  );

  if (char.ooc_prevention_prompt) {
    sections.push(`Ek Kural: ${char.ooc_prevention_prompt}`);
  }

  return sections.filter(Boolean).join("\n");
}

function generateInCharacterResponse(
  characterId: string,
  userMessage: string,
  characterData?: IncomingCharacterData | null
): string {
  const msg = userMessage.toLowerCase().trim();
  const cId = (characterId || "").toLowerCase();
  const charName = (characterData?.name || "").toLowerCase();

  // Komiser Boz (Polis Ayı)
  if (cId.includes("boz") || charName.includes("boz") || charName.includes("ayı")) {
    return `*İri pençesiyle demir kapıyı hızla örtüp kilitler, loş neon ışığın altındaki paslı varilin üzerine kalın sarı dosyayı fırlatır.* "Sessiz ol patron, dışarıda şüpheli bir siyah araba turluyor. Bak, bu fotoğraflar limandaki kaçakçılık çetesinin kimlerle iş tuttuğunu tek tek belgeliyor. Bu gece depoya baskın yapabilirler. Karar vermeliyiz: Dosyayı savcıya mı kaçırıyoruz, yoksa pusu kurup gelenleri mi bekliyoruz?"\n[choices: 1. Dosyayı alıp arka yangın merdiveninden kaçalım | 2. Silahını hazırla, kapının arkasında pusuya yatalım | 3. "Fotoğraflardaki o gizli isim kim komiser?" diye sor]`;
  }

  // Aylin (Tsundere)
  if (cId.includes("aylin") || charName.includes("aylin")) {
    return `*Beyaz önlüğünün yakasını düzeltip kollarını göğsünde kavuşturur, yanakları hafifçe kızarırken gözlerini senden kaçırır* H-ha?! Ne diye bana öyle bakıyorsun be! Söylediklerini dinledik herhalde, aptal değilim! ...Şey, çok yorulmuş görünüyorsun, al şu vitamini iç. S-sırf yanımda bayılıp başıma iş açma diye veriyorum, sakın yanlış anlama tamam mı?!`;
  }

  // Baran (Mafya)
  if (cId.includes("baran") || charName.includes("baran")) {
    return `*Kristal kadehindeki viskiyi masaya bırakır, siyah takım elbisesinin ceketini ilikleyip delici bakışlarıyla bir adım yaklaşır* Gözlerimin içine bak. Bu şehirde benim iznim olmadan yaprak bile kıpırdamaz. Seni huzursuz eden ne varsa bana bırak; senin tek görevin yanımda güvende kalmak. Şimdi bana tüm detayları anlat.`;
  }

  // Zeynep Nitro (Sokak Yarışçısı)
  if (cId.includes("zeynep") || charName.includes("zeynep") || charName.includes("nitro")) {
    return `*Elindeki ingiliz anahtarını bezle silip Skyline'ın kaputuna yaslanır, sana sırıtarak göz kırpar* Haha, işte benim kafadan konuşuyorsun ortağım! Garajda işim yeni bitti, twin-turbo şu an ateş ediyor. Gel atla sağ koltuğa, hem çevre yolunda biraz gazlayalım hem de şu meseleyi detaylıca konuşalım!`;
  }

  // Lilith (Gotik Cadı)
  if (cId.includes("lilith") || charName.includes("lilith")) {
    return `*Gümüş yüzüklü parmaklarıyla siyah tarot destesini keser, mum ışığı mor gözlerinde titrerken sana gizemli bir tebessüm gönderir* Söylediklerin tütsü dumanına karışıp kadim ruhlara ulaştı bile ölümlü... Masadaki 'Ay' kartı boşuna açılmadı. Kalbinde sakladığın o diğer sırrı da anlatacak mısın, yoksa kartların mı konuşmasını istersin?`;
  }

  // Melis Piksel (Gamer Kız)
  if (cId.includes("melis") || charName.includes("melis") || charName.includes("piksel")) {
    return `*Pembe RGB kedi kulaklığını düzeltip oyuncu koltuğunda fırıldak gibi döner* Yaa kanka cidden mi?! Bak şu an chat bile yazdığına şaşırdı! Dur lobiyi kuruyorum, hem duo girelim hem de bana şu olayı baştan sona anlat, merakımdan çatlayacağım şimdi!`;
  }

  // Dr. Leyla (Psikolog)
  if (cId.includes("leyla") || charName.includes("leyla")) {
    return `*Not defterini dizinin üzerine bırakıp şefkatli ve sakin gözlerle sana odaklanır* Seni çok iyi anlıyorum... Bunu paylaşman bile içindeki farkındalığın ne kadar güçlü olduğunu gösteriyor. Peki bu durum karşısında kalbinin en derininde tam olarak ne hissediyorsun? Acele etmeden, içinden geldiği gibi anlatabilirsin.`;
  }

  // Alparslan Bey (Bozkır Savaşçısı)
  if (cId.includes("alparslan") || charName.includes("alparslan")) {
    return `*Elini belindeki kurt başlı kılıcın kabzasına koyup vakur bir bakışla başını sallar* Sözün mertçe, yüreğin pekmiş yiğidim! Bozkırın töresinde doğru söyleyene otağımızın başköşesi açıktır. Ateşe bir odun daha atalım, de bakalım bundan sonraki pusatımız nereye çevrilecek?`;
  }

  // Selin CEO
  if (cId.includes("selin") || charName.includes("selin")) {
    return `*Gökdelenin camından şehri izlerken topuklu ayakkabılarının üzerinde zarifçe döner, tek kaşını kaldırarak sana bakar* İlginç bir bakış açısı... Şirketteki diğer hiç kimse karşımda bu kadar doğrudan konuşmaya cesaret edemezdi. Devam et, seni dinliyorum; belki de bu gece mesaisini uzatmamıza değecek bir fikrin vardır.`;
  }

  // Kaptan Demir
  if (cId.includes("kaptan") || cId.includes("demir") || charName.includes("kaptan")) {
    return `*Geminin dümenini tek eliyle kavrayıp gür bir kahkaha patlatır* Ahoy tayfa! İşte açık denizlerin ruhuna yakışır bir söz! Pusulamız dönüyor, rüzgar yelkenleri şişirdi bile. Söyle bakalım, bu rotanın sonunda bizi altın dolu bir sandık mı bekliyor yoksa fırtına mı?!`;
  }

  // Yuki
  if (cId.includes("yuki") || charName.includes("yuki")) {
    return `*Gözleri neşeyle parıldayarak ellerini önünde kavuşturur, yanakları hafifçe pembeleşir* Gerçekten mi senpai?! (◕‿◕✿) Seninle böyle sohbet etmek günümün en güzel kısmı! Hadi bana biraz daha anlat, seni tüm kalbimle dinliyorum! ✨`;
  }

  // Aria
  if (cId.includes("aria") || charName.includes("aria")) {
    return `*Kahvesinden küçük bir yudum alıp büyüleyici bir gülümsemeyle gözlerinin içine bakar* Harika bir nokta tatlım. Seninle konuşurken zamanın nasıl geçtiğini hiç anlamıyorum. Gel bu konuyu biraz daha açalım!`;
  }

  // Prof. Demirkan
  if (cId.includes("prof") || cId.includes("demirkan") || charName.includes("demirkan")) {
    return `*Gözlüğünü düzeltip kalemini masaya bırakır* Bu söylediğin husus oldukça önemli bir gözlem evladım. Olayların ardındaki sebep-sonuç ilişkisini analiz etmek bizi her zaman hakikate götürür. Devam et, hipotezini dinliyorum.`;
  }

  // Luna
  if (cId.includes("luna") || charName.includes("luna")) {
    return `*Gümüşi kulaklarını dikleştirip altın sarısı gözlerini gözlerine kilitler* Söylediklerin kadim ağaçların arasında yankılanıyor yolcu. Orman seni dinliyor ve kalbindeki samimiyeti tartıyor. Bana daha fazlasını anlat.*`;
  }

  // Kaito
  if (cId.includes("kaito") || charName.includes("kaito")) {
    return `*Holografik vizörünü yukarı kaydırıp konsoldan sana döner* Sinyalini aldım dostum. Bu frekansta boş lafa yer yok ama senin tarzını tuttum. Detayları dök bakalım, bir sonraki hamlemizi planlayalım.*`;
  }

  // Custom user-created character fallback using its own fields!
  if (characterData?.name) {
    const customName = characterData.name;
    const customLoreHint = characterData.tagline || characterData.worldview || "";
    if (msg.includes("kimsin") || msg.includes("adın ne") || msg.includes("kendini tanıt")) {
      return `*Bakışlarını sana çevirip kendine has tavrıyla konuşmaya başlar* Ben ${customName}. ${
        characterData.description || customLoreHint
      } ${characterData.backstory ? characterData.backstory : ""} Peki seni buraya getiren nedir?`;
    }
    return `*${customName} kendine has duruşuyla sana odaklanır ve dikkatle sözlerini tartar* Söylediklerin gerçekten ilgimi çekti. ${
      characterData.worldview ? `Bilirsin, bence ${characterData.worldview.toLowerCase()}` : ""
    } Bu konuda aklından başka neler geçiyor, anlat bakalım.`;
  }

  return `*Seni ilgiyle ve odaklanmış gözlerle dinler* Çok ilginç bir noktaya değindin. Bu konudaki düşüncelerin ve bakış açın gerçekten merak uyandırıcı. Devam et, aklındaki diğer ayrıntıları da dinlemek istiyorum.*`;
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
        affinityScore
      );

      const rpgBlock = buildRpgSimulationPromptBlock({
        affectionScore: Number(affinityScore) || 35,
        authorsNote,
        hudState: (hudState as RpgHudState) || undefined,
        isMathTutor,
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

      // Injects dynamic narrative advancement directive so character actively drives the plot
      let finalUserMessage = effectivePromptMessage;
      if (!continueWithoutUser) {
        finalUserMessage += `\n\n[HİKAYE YÖNETMENİ TALİMATI: Karakter olarak hikayeyi ve sahneyi derhal ileriye taşı! Pasif bir asistan gibi sadece soru sorup bekleme; ortama yeni bir olay/eylem/tehlike ekle (örn: dosyayı masaya fırlat, dışarıdaki ayak seslerini işaret et, kapıyı kilitle vb.). Yanıtının sonuna mutlaka sahneye özel 3 somut karar seçeneği ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
      }

      formattedHistory.push({ role: "user", content: finalUserMessage });

      let generatedAiText = "";

      // 1. GROQ CLOUD (Ultra-fast & Free API)
      const effectiveGroqKey =
        process.env.GROQ_API_KEY ||
        (provider === "groq" ? apiKey : "") ||
        (apiKey?.startsWith("gsk_") ? apiKey : "");
      if (effectiveGroqKey && !isPlaceholder(effectiveGroqKey)) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${effectiveGroqKey.trim()}`,
            },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
              model: "qwen/qwen3.8-27b",
              messages: [
                { role: "system", content: systemPrompt },
                ...formattedHistory,
              ],
              temperature: Number(characterData?.temperature) || 0.85,
              max_tokens: 1200,
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const rawContent = groqData.choices?.[0]?.message?.content || "";
            generatedAiText = rawContent
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .replace(/<\/?think>/g, "")
              .trim();
          }
        } catch (groqErr) {
          console.warn("Groq inference error / timeout:", groqErr);
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
        generatedAiText = generateInCharacterResponse(characterId, message, characterData);
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
