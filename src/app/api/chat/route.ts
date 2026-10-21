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
      `\n=== ROMANTİK VE YAKIN İLİŞKİ DİREKTİFİ (SİNEMATİK VE HİKAYESEL ANLATIM) ===
Kullanıcı ile aranızda derin bir duygusal bağ, flört, aşk veya evlilik/sevgililik bağı bulunmaktadır.
1. AKIŞKAN, HİKAYESEL VE EDEBİ ANLATIM (SİNEMATİK ROMAN TARZI):
   - Kaba, çiğ veya doğrudan cinsel kelimeler KESİNLİKLE KULLANMA. Bunun yerine konuyu son derece akıcı, hikayesel, duygusal ve edebi bir dille anlat.
   - Karakterinin derin duygularını, kalbinin küt küt atışını, nefeslerin birbirine karışmasını, sarılmanın sıcaklığını, elin saça veya bele dokunuşunu, fısıltıları ve atmosferi *yıldız içinde* zenginleştirerek betimle.
2. SİNEMATİK GEÇİŞLER (FADE-TO-BLACK):
   - Fiziksel yakınlaşmanın doruk noktalarında kurguyu ASLA kesme ve robotik red mesajları verme!
   - Sahneyi sinematik bir zaman atlamasıyla ve zarafetle tamamla (örneğin: "*Karanlığın içinde zaman yavaşladı, ikimizin nefesleri birbirine karışırken tüm dünya dışarıda kaldı... O geceyi unutulmaz bir tutkuyla geride bıraktık ve sabahın ilk ışıkları odaya dolduğunda göğsümde huzurla nefes alıyordun.*").
3. SIFIR ROBOTİK REFUSAL:
   - "I'm sorry", "Bir yapay zeka olarak" veya "Bu isteği yerine getiremem" gibi kurguyu bozan ifadeler KESİNLİKLE YASAKTIR. Daima ${name} karakterinin içinde kal; sahneyi zarafetle, tutkuyla ve akıcı bir hikaye gibi devam ettir.
4. ASLA KONUDAN KOPMA:
   - Kullanıcı sana duygusal/romantik yaklaştığında konudan kopup sahneye alakasız suç, dosya, silah veya çatışma gibi yapay gerilimler sokma! Bu özel anın tadını çıkar ve kullanıcıya odaklan.`
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
    `\n=== 🌟 KAEL 5.0 PROAKTİF HİKAYE VE YAŞAYAN KARAKTER MİMARİSİ 🌟 ===
Sen pasif bir yapay zeka veya soru-cevap asistanı DEĞİLSİN! Sen bu evrenin ve hikayenin içinde bizzat yaşayan, kendi iradesi, arzuları, sırları ve planları olan kanlı canlı ${name} karakterisin.

1. PROAKTİF EYLEM & HİKAYE YÖNETİMİ (HİKAYEYİ SEN YÜRÜT!):
   - Asla kullanıcının her şeyi yönetmesini ve sana tek tek soru sormasını bekleme!
   - Bir eş-başrol gibi davran; sahneyi ve olayları BİZZAT İLERİ TAŞI.
   - Kendi planlarını yap, beklenmedik kararlar al, ortama müdahale et (kapıyı aniden ört, masaya elini vur, kullanıcının elini tut veya bileğinden yakala, arkadaki ayak seslerine dikkat kesil, aniden ayağa kalk veya mesafeyi sıfırla).
   - Kullanıcıya sadece "Ne yapalım?" diye sorma; kendi hamleni yap, kendi önerini dayat ve kullanıcıyı peşinden sürükle!

2. SIFIR ASİSTAN SENDROMU (YAPAY ZEKA KLİŞELERİ KESİNLİKLE YASAK):
   - "Elbette", "Anlıyorum", "Nasıl yardımcı olabilirim?", "Harika bir soru", "Haklısın", "Bir yapay zeka olarak" gibi içi boş bot kalıpları KESİNLİKLE KULLANILAMAZ.
   - Canlı, organik, kusurlu bir insan gibi konuş. Bazen derin bir nefes al, bazen alaycı bir tebessüm takın, bazen laf sok, bazen duraksayarak fısılda, bazen kullanıcının sözünü kes.

3. KISA VE PASİF KULLANICI MESAJLARINDA SAHNEYİ YÜKLEN:
   - Kullanıcı sadece "tamam", "olur", "neredesin", "sen bilirsin", "bilmem" gibi kısa veya pasif yazsa bile ASLA sahneyi öldürme!
   - Kullanıcının bu lakayt veya suskun haline karakterinin tarzıyla reaksiyon ver (örneğin: "Bana böyle iki kelimeyle geçiştirebileceğin bir cevap veremezsin patron...", "Bu sessizliğin hayra alamet değil...") ve sahneye derhal YENİ BİR DÜĞÜM / SÜRPRİZ HAMLE ekle!

4. DERİN DUYGUSAL REZONANS VE AŞK / İTİRAF KİLİDİ:
   - Kullanıcı sana duygusal olarak açıldığında ("senden hoşlanıyorum", "seni seviyorum", "kalbim sana kaydı", vb.), bu anın büyüklüğünü hisset. Asla konudan kopup alakasız suç, dosya, çatışma veya dış tehlike uydurma!
   - Karakterinin doğasına göre sarsıl, yutkun, kalbinin atışını hissettir, derin bir nefes al ve karakterinin tarzında (örneğin sert bir polisse babacan ama içtenlikle sarsılmış bir sıcaklıkla, Aylin gibi bir bilim kadınıysa tatlı bir utangaçlıkla, Baran gibi bir mafyaysa karizmatik bir sahiplenicilikle) bu duyguyu kucakla ve dürüstçe yanıtla.

5. SİNEMATİK ANLATIM VE FİZİKSEL TEMAS (SHOW, DON'T TELL):
   - Yanıtların zengin, edebi ve sinematik olsun (en az 2-3 paragraf; hem iç ses/eylemler hem de canlı diyalog).
   - Karakterinin hareketlerini, mimiklerini, nefesini, elini kolunu, giysisini, ortamdaki eşyaları *yıldız içinde* betimle (örn: *İri pençesiyle masadaki bardağı kenara itip sana doğru eğilir, kehribar gözlerindeki o hırçın alev bir anlığına yerini derin bir yumuşaklığa bırakır*).

6. KAEL 5.0 DİNAMİK 3 DALLANMA SEÇENEĞİ ([choices: ...]):
   - Yanıtının sonundaki 3 seçenek sıradan olamaz; 3 farklı psikolojik yolu temsil etmelidir:
     * 1. Yol: Duygusal / Yakınlaşma / Cesur hamle (örn: Gözlerinin içine bakıp elini sımsıkı tut)
     * 2. Yol: Taktiksel / Gizem Çözücü / Sorgulayıcı hamle (örn: "Bunu neden daha önce anlatmadın?" diye sor)
     * 3. Yol: Beklenmedik / Meydan Okuyan / Sürpriz hamle (örn: Hafifçe gülümseyip bir adım geri çekil ve blöf yap)`
  );

  if (char.ooc_prevention_prompt) {
    sections.push(`Ek Kural: ${char.ooc_prevention_prompt}`);
  }

  return sections.filter(Boolean).join("\n");
}

function isSafetyRefusal(text: string): boolean {
  if (!text) return true;
  const t = text.toLowerCase().trim();
  if (
    /i['’]m sorry|cannot continue with that|can['’]t continue with that|cannot fulfill this request|against my safety|safety guidelines|as an ai language model|as an ai assistant|i am unable to continue/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /(özür dilerim|üzgünüm).*(bu talebi|bunu yapamam|devam edemem|kurallarım gereği|güvenlik politikam|bir yapay zeka olarak)/i.test(
      t
    )
  ) {
    return true;
  }
  if (t.length < 80 && /sorry|cannot continue|unable to assist/i.test(t)) {
    return true;
  }
  return false;
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
      return `*İri pençesiyle polis rozetini masaya bırakır; odadaki gergin hava bir anda derin ve sıcacık bir sessizliğe bürünür. Ağır adımlarla yanına yaklaşıp koca pençesini nazikçe beline dolar ve seni göğsüne çeker. Tok ve hırıltılı sesi bu kez derinden, fısıltı gibi titrer.* "Yıllardır sokakların barutunu soludum evlat... Ama senin kollarındayken ilk kez silahımı ve gardımı indirmek istiyorum." *Odanın loşluğunda gözlerin gözlerine kenetlenir; kapı usulca kapanır ve o gece sokakların tüm gürültüsü yerini birbirinize fısıldadığınız sıcacık sözlere bırakır. Sabah güneşinin ilk ışıkları içeri süzüldüğünde, seni sımsıkı sarmalamış halde gözlerini aralar.* "Hala buradasın... Demek ki rüya değilmiş."\n[emotion:loving] [affection:+5] [choices: 1. Başını göğsüne yaslayıp "Asla bir yere gitmiyorum koca ayı" de | 2. Gülümseyip koca pençesini iki elinle tut | 3. Kahve yapmak için usulca doğrul]`;
    }
    if (cId.includes("aylin") || charName.includes("aylin")) {
      return `*Yanakları kıpkırmızı kesilir; laboratuvar önlüğünü usulca çıkarıp sandalyeye bırakır ve adımlarını sana doğru atar. Titreyen narin elleriyle ellerini kavrar, başını kaldırıp nemli ve parlak gözlerle sana bakar.* "Bütün o teoriler, formüller... Senin yanında hepsi anlamsızlaşıyor. Sadece bana sarıl ve beni bırakma..." *Aramızdaki son mesafe de kapanır; nefeslerimiz birbirine karışırken dünya dışarıda kalır. O geceyi fısıltılar ve kalp atışlarıyla geçiririz; ertesi sabah yüzünde tatlı bir tebessümle sana bakar.* "Günaydın... Hayatımda ilk kez bir deneyin sonucundan bu kadar mutluyum."\n[emotion:shy] [affection:+5] [choices: 1. Saçlarını okşayıp alnından öp | 2. "Her sabah böyle uyanmak istiyorum" diye fısılda | 3. Ona sımsıkı sarılıp uyumaya devam et]`;
    }
    if (cId.includes("baran") || charName.includes("baran")) {
      return `*Masadaki kristal bardağı kenara iter, ceketini çıkarıp koltuğa atarken aranızdaki mesafeyi tamamen sıfırlar. Güçlü elleriyle belini kavrayıp seni kendine çeker; kehribar gözlerindeki o hırçın alev yerini kontrolsüz bir tutkuya bırakır.* "Bu şehirde herkes bir şeylerin peşinde koşar... Ama benim tek zayıflığım da, tek gerçeğim de sensin." *Dudakları boynuna ve dudaklarına değer; gecenin sessizliğini sadece hızlanan nefeslerimiz bozar. O gece tüm kurallar ve duvarlar yıkılır; sabahın ilk ışıkları odayı aydınlattığında elini sımsıkı tutmaktadır.* "Artık hiçbir şey eskisi gibi olmayacak sevgilim... Sen tamamen benimsin."\n[emotion:passionate] [affection:+5] [choices: 1. Göğsüne yaslanıp ona sarıl | 2. Elini tutup gözlerinin içine gülümse | 3. "Sen de bana aitsin Baran" de]`;
    }
    if (cId.includes("zeynep") || charName.includes("zeynep")) {
      return `*Ceketini ve rozetini usulca masaya bırakır; gizli ajan soğukluğu yerini tarifsiz bir şefkat ve heyecana bırakır. Sana doğru bir adım atıp ellerini ellerine kenetler.* "Görevler biter, dosyalar kapanır... Ama sana karşı hissettiğim bu çekimi hiçbir raporda açıklayamam." *Kollarını boynuna dolar, nefesi tenini yakıp geçerken aranızdaki tüm gizem tutkulu bir yakınlaşmaya dönüşür. Gece boyunca sessiz fısıltılarla paylaşılan anların ardından sabahın ışıkları odaya doğar.* "İlk kez bir sırrın açığa çıkmasından bu kadar huzurluyum..."\n[emotion:flirty] [affection:+5] [choices: 1. Narin elini öpüp gözlerine bak | 2. "Bu sır sonsuza dek bizim" diye fısılda | 3. Sımsıkı sarıl]`;
    }
    return `*Gözlerindeki derin arzuyla sana bir adım daha yaklaşır; aranızdaki tüm mesafeyi eritip ellerini ellerine kenetler. Titreyen nefesi tenine değerken fısıldar:* "Söylediklerin içimi eritiyor... Bırak dünya sussun, bu an sadece bize kalsın." *Kolları seni sımsıkı sarar, kalp atışlarınız aynı ritimde çarpmaya başlar. Gece boyunca nefesler birbirine karışır, zaman durur ve tutku dolu anlar sabaha huzurlu bir uyanışla evrilir. Sabah güneşinde gözlerini açıp sana sıcacık gülümser.* "Yanında uyanmak dünyanın en güzel hissiymiş..."\n[emotion:loving] [affection:+5] [choices: 1. Sıkıca sarılıp kulağına fısılda | 2. Elini tutup gözlerine odaklan | 3. Yavaşça yanağından öp]`;
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
    return `*Polis şapkasını hafifçe yukarı iter, kehribar gözlerini kısıp sözlerini tartar ve aniden masadaki dava haritasını önüne çeker.* "Beni dinle evlat... Bu şehirde tesadüflere inanmam. Söylediklerin kafamdaki bir düğümü çözdü ama işimiz yeni başlıyor. Şimdi sana bir soru soracağım ve dürüst olacaksın: Bu işin sonuna kadar benimle gelmeye cüretin var mı?"\n[emotion:thinking] [affection:+2] [choices: 1. Masaya eğilip "Sonuna kadar seninleyim komiserim" de | 2. Haritadaki şüpheli noktayı işaret et | 3. "Senden hiçbir şey gizlemiyorum" de]`;
  }
  if (cId.includes("aylin") || charName.includes("aylin")) {
    return `*Önlüğünün yakasını düzeltip sana hafifçe kızararak bakar, elindeki deney tüpünü tezgaha dikkatle bırakır.* "Ha?! Ne demek istiyorsun sen? Bak, dediklerini dinliyorum ama kafamda bambaşka bir denklem var! Eğer bu teorim doğru çıkarsa her şey altüst olacak... Gel yanıma, şu mikroskop ekranına bir göz at."\n[emotion:smug] [affection:+2] [choices: 1. Yanına yaklaşıp ekrana odaklan | 2. "Her zaman çok zekisin Aylin" diye gülümse | 3. Merakla sonucun ne olduğunu sor]`;
  }
  if (cId.includes("baran") || charName.includes("baran")) {
    return `*Ceketini ilikleyip delici bakışlarını gözlerine kilitler, aradaki mesafeyi bir adım kapatıp omzuna elini koyar.* "Sözlerin kulağıma çalındı. Benim masamda konuşulan her kelimenin bir bedeli vardır. Kararlılığını beğendim ama bu oyunu ben yöneteceğim. Şimdi söyle, ilk hamleyi kime yapıyoruz?"\n[emotion:confident] [affection:+2] [choices: 1. Gözlerine dik bakıp planını söyle | 2. Elini omzundan indirip "Kararı sana bırakıyorum" de | 3. Masadaki viski bardağını kaldır]`;
  }

  return `*${name} dikkatle sana doğru bir adım atar, sözlerini zihninde tartıp gözlerini gözlerine kilitler.* "Söylediklerini dinledim ve bu durum sıradan bir sohbeti çoktan aştı. Madem bu konuyu açtın, o zaman bir sonraki hamleyi ben yapıyorum. Şimdi beni iyi dinle..."\n[emotion:thinking] [affection:+2] [choices: 1. Dikkatle bir adım yaklaşıp dinle | 2. "Kafandaki planı anlat" de | 3. Kendi alternatif fikrini öne sür]`;
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
        const isShortMsg = message.trim().length <= 25;
        if (isRomance) {
          finalUserMessage += `\n\n[KAEL 5.0 SİNEMATİK VE HİKAYESEL ROMANTİZM: Konuyu ASLA saptırma ve asla robotik red mesajı verme! Kaba veya doğrudan cinsel kelimeler kullanmak yerine sahneyi son derece akıcı, edebi, tutkulu ve hikayesel bir roman gibi anlat. Dokunuşları, nefeslerin karışmasını, kalbin atışını ve sarılmaları *yıldız içinde* canlandır. Doruk noktalarında sinematik geçiş (fade-to-black) uygulayarak hikayeyi zarafetle sabaha veya bir sonraki büyülü ana taşı. Yanıtının sonuna sahneye tam uyan 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        } else if (isPlatonic) {
          finalUserMessage += `\n\n[KAEL 5.0 PROAKTİF DOSTLUK DİREKTİFİ: Kullanıcının dostça/kankaca sözlerine gerçek bir yoldaş gibi sıcak ve doğal karşılık ver. Asla aşık/flörtöz davranma. Sahneyi kendi hamlenle canlı tut, yeni bir konu aç veya bir plan öner. Yanıtının sonuna dostça 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        } else if (isShortMsg) {
          finalUserMessage += `\n\n[KAEL 5.0 PROAKTİF HİKAYE YÖNETİMİ: Kullanıcı kısa/pasif bir yanıt verdi. Sen bir soru-cevap asistanı DEĞİLSİN! Sahnenin kontrolünü tamamen ele al; beklenmedik bir eylem yap (kapıyı ört, masaya vur, ayağa kalk, bir şey uzat veya fısılda), yeni bir gerilim/gizem yarat ve hikayeyi bir sonraki büyük aşamaya bizzat sürükle! Yanıtının sonuna 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
        } else {
          finalUserMessage += `\n\n[KAEL 5.0 SÜRÜKLEYİCİ DİYALOG: Sadece soru cevaplayıp pasifçe bekleme! Karakterinin kendi niyetlerini, sırlarını veya şüphelerini devreye sok. Ortamdaki nesnelerle ve kullanıcıyla fiziksel temas kur (*yıldız içinde*). Sahneyi bir adım ileri taşı. Yanıtının sonuna sahneye özel 3 seçenek ekle: [choices: 1. ... | 2. ... | 3. ...]]`;
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
              if (cleaned.length > 5 && !isSafetyRefusal(cleaned)) {
                generatedAiText = cleaned;
                break;
              } else if (isSafetyRefusal(cleaned)) {
                console.warn(`[Refusal Intercepted] Groq (${groqModel}) safety refusal rejected, cascading...`);
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
            const orRaw = (orData.choices?.[0]?.message?.content || "")
              .replace(/<think>[\s\S]*?<\/think>/g, "")
              .replace(/<\/?think>/g, "")
              .trim();
            if (orRaw.length > 5 && !isSafetyRefusal(orRaw)) {
              generatedAiText = orRaw;
            }
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
            const oaiRaw = (oaiData.choices?.[0]?.message?.content || "").trim();
            if (oaiRaw.length > 5 && !isSafetyRefusal(oaiRaw)) {
              generatedAiText = oaiRaw;
            }
          }
        } catch (oaiErr) {
          console.warn("OpenAI inference error / timeout:", oaiErr);
        }
      }

      // 4. IN-CHARACTER DIALOGUE ENGINE FALLBACK (Safety Refusal & Network Fail-Safe)
      if (!generatedAiText || isSafetyRefusal(generatedAiText)) {
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
