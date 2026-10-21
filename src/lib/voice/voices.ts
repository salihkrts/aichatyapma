export interface NeuralVoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  badge: string;
  description: string;
  providerModel: "tts-1" | "microsoft/mai-voice-2.1-flash";
  providerVoice: string;
  fallbackOpenAiVoice: "nova" | "shimmer" | "alloy" | "fable" | "echo" | "onyx";
  speed: number;
  sampleText: string;
  edgeVoice?: string;
  edgePitch?: string;
  edgeRate?: string;
}

export const CHARACTER_VOICES: NeuralVoiceOption[] = [
  {
    id: "deep-boss-boz",
    name: "🐻 Komiser Boz (Tok, Derin & Babacan Ayı)",
    gender: "male",
    badge: "Tok Ayı Erkek",
    description: "Çok derin, ağırbaşlı, tok, hırıltılı ve babacan komiser ayı sesi (Doğal Türkçe Neural)",
    providerModel: "tts-1",
    providerVoice: "onyx",
    fallbackOpenAiVoice: "onyx",
    speed: 0.92,
    edgeVoice: "tr-TR-AhmetNeural",
    edgePitch: "-15Hz",
    edgeRate: "-6%",
    sampleText: "Geç bakalım içeri evlat, Boz baban seni dinliyor. Anlat derdini.",
  },
  {
    id: "charismatic-baran",
    name: "🥃 Baran (Karizmatik, Derin & Soğukkanlı Erkek)",
    gender: "male",
    badge: "Karizmatik Erkek",
    description: "Derin, tehlikeli, sakin ve etkileyici mafya lideri sesi",
    providerModel: "tts-1",
    providerVoice: "onyx",
    fallbackOpenAiVoice: "onyx",
    speed: 1.0,
    edgeVoice: "tr-TR-AhmetNeural",
    edgePitch: "-6Hz",
    edgeRate: "-2%",
    sampleText: "Gözlerimin içine bak. Bu şehirde kimse sana dokunamaz.",
  },
  {
    id: "epic-warrior-alparslan",
    name: "⚔️ Alparslan (Gür & Destansı Savaşçı)",
    gender: "male",
    badge: "Destansı Erkek",
    description: "Gür, vakur ve sinematik komutan / RPG anlatıcı sesi",
    providerModel: "microsoft/mai-voice-2.1-flash",
    providerVoice: "tr-TR-Grant",
    fallbackOpenAiVoice: "onyx",
    speed: 0.95,
    edgeVoice: "tr-TR-AhmetNeural",
    edgePitch: "-8Hz",
    edgeRate: "+0%",
    sampleText: "Otağıma sefalar getirdin yiğidim! Söz namustur, pusat kalkanımızdır!",
  },
  {
    id: "tr-aydin-mentor",
    name: "🎓 Prof. Aydın (Bilge & Kültürlü Türkçe Erkek)",
    gender: "male",
    badge: "Bilge Erkek",
    description: "Akıcı, kültürlü ve güven veren doğal Türkçe hoca / mentor sesi",
    providerModel: "microsoft/mai-voice-2.1-flash",
    providerVoice: "tr-TR-Aydin",
    fallbackOpenAiVoice: "echo",
    speed: 1.0,
    edgeVoice: "tr-TR-AhmetNeural",
    edgePitch: "-2Hz",
    edgeRate: "-4%",
    sampleText: "Hoş geldin genç dostum. Bugün hangi konuyu birlikte inceliyoruz?",
  },
  {
    id: "young-rebel-kaito",
    name: "⚡ Kaito (Genç, Asi & Enerjik Erkek)",
    gender: "male",
    badge: "Genç Erkek",
    description: "Dinamik, samimi ve modern genç hacker erkek sesi",
    providerModel: "tts-1",
    providerVoice: "echo",
    fallbackOpenAiVoice: "echo",
    speed: 1.05,
    edgeVoice: "tr-TR-AhmetNeural",
    edgePitch: "+4Hz",
    edgeRate: "+6%",
    sampleText: "Frekansıma hoş geldin ortak! Hazırsan sistemi kırıyoruz.",
  },
  {
    id: "tsundere-aylin",
    name: "🩺 Aylin (Tsundere & Doğal Genç Kız)",
    gender: "female",
    badge: "Tsundere Kız",
    description: "Hafif sert, gururlu ama içten içe tatlı ve şefkatli genç kız tonu",
    providerModel: "tts-1",
    providerVoice: "nova",
    fallbackOpenAiVoice: "nova",
    speed: 1.03,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "+5Hz",
    edgeRate: "+4%",
    sampleText: "Y-yanlış anlama sakın! Sadece merak ettiğim için aradım seni!",
  },
  {
    id: "anime-girl-yuki",
    name: "🌸 Yuki (Tatlı & Neşeli Anime Kızı)",
    gender: "female",
    badge: "Anime Kız",
    description: "Genç, cıvıl cıvıl, enerjik ve sevimli anime kızı sesi",
    providerModel: "tts-1",
    providerVoice: "nova",
    fallbackOpenAiVoice: "nova",
    speed: 1.12,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "+12Hz",
    edgeRate: "+8%",
    sampleText: "Konnichiwa senpai! Bugün seninle konuşmak için sabırsızlanıyordum!",
  },
  {
    id: "tr-elif-natural",
    name: "🎀 Elif (Doğal & Samimi Genç Kız)",
    gender: "female",
    badge: "Doğal TR Kadın",
    description: "Duru, akıcı ve çok doğal Türkçe genç kadın sesi",
    providerModel: "microsoft/mai-voice-2.1-flash",
    providerVoice: "tr-TR-Elif",
    fallbackOpenAiVoice: "nova",
    speed: 1.0,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "+0Hz",
    edgeRate: "+0%",
    sampleText: "Selam! Seni duymak çok güzel, bugün günün nasıl geçiyor?",
  },
  {
    id: "warm-woman-aria",
    name: "💋 Aria (Sıcak, Çekici & Kadifemsi Kadın)",
    gender: "female",
    badge: "Çekici Kadın",
    description: "Yumuşak, romantik, sıcak ve kadifemsi zarif kadın sesi",
    providerModel: "tts-1",
    providerVoice: "shimmer",
    fallbackOpenAiVoice: "shimmer",
    speed: 0.98,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "-3Hz",
    edgeRate: "-4%",
    sampleText: "Merhaba tatlım, sesini duymak bana her zaman çok iyi geliyor.",
  },
  {
    id: "therapist-leyla",
    name: "🌿 Leyla (Şefkatli & Huzurlu Kadın)",
    gender: "female",
    badge: "Şefkatli Kadın",
    description: "Sakinleştirici, empatik ve güven veren huzurlu kadın sesi",
    providerModel: "tts-1",
    providerVoice: "shimmer",
    fallbackOpenAiVoice: "shimmer",
    speed: 0.92,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "-2Hz",
    edgeRate: "-5%",
    sampleText: "Derin bir nefes al lütfen. Seni tüm kalbimle dinliyorum.",
  },
  {
    id: "gamer-girl-melis",
    name: "🎮 Melis (Enerjik Gamer & Yayıncı Kız)",
    gender: "female",
    badge: "Gamer Kız",
    description: "Hızlı, neşeli, heyecanlı Z kuşağı yayıncı kız sesi",
    providerModel: "microsoft/mai-voice-2.1-flash",
    providerVoice: "tr-TR-Harper",
    fallbackOpenAiVoice: "nova",
    speed: 1.08,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "+6Hz",
    edgeRate: "+8%",
    sampleText: "Hele şükür geldin kanka! Hadi mikrofonu aç da oyuna girelim!",
  },
  {
    id: "mystic-witch-lilith",
    name: "🔮 Lilith (Gizemli & Büyüleyici Kadın)",
    gender: "female",
    badge: "Mistik Kadın",
    description: "Esrarengiz, şiirsel ve büyüleyici gece cadısı tonu",
    providerModel: "tts-1",
    providerVoice: "fable",
    fallbackOpenAiVoice: "fable",
    speed: 0.95,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "-2Hz",
    edgeRate: "-4%",
    sampleText: "Gece yarısı kapımı çalacağını kartlarımda çoktan görmüştüm.",
  },
  {
    id: "boss-woman-selin",
    name: "💎 Selin (Otoriter & Özgüvenli CEO Kadın)",
    gender: "female",
    badge: "Otoriter Kadın",
    description: "Net, keskin, karizmatik ve kural koyucu kadın sesi",
    providerModel: "tts-1",
    providerVoice: "alloy",
    fallbackOpenAiVoice: "alloy",
    speed: 0.97,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "-4Hz",
    edgeRate: "+0%",
    sampleText: "Üç dakika geciktin. Kapıyı kapat ve hemen masama yaklaş.",
  },
  {
    id: "cyber-android-nova",
    name: "🤖 NOVA-9 (Duygusal Siber-Android Kadın)",
    gender: "female",
    badge: "Android Kız",
    description: "Berrak, fütüristik ve duygusal sentetik kadın sesi",
    providerModel: "tts-1",
    providerVoice: "alloy",
    fallbackOpenAiVoice: "alloy",
    speed: 1.05,
    edgeVoice: "tr-TR-EmelNeural",
    edgePitch: "+2Hz",
    edgeRate: "+4%",
    sampleText: "Sistem taraması tamamlandı. Ses frekansın kalp atışımı hızlandırıyor.",
  },
];

// Eski ElevenLabs ID'lerini ve karakter kimliklerini doğru seslere eşleştir
export function resolveCharacterVoice(character?: {
  id?: string | null;
  name?: string | null;
  voice_id?: string | null;
  category?: string | null;
  tags?: string[] | null;
} | null): NeuralVoiceOption {
  if (!character) return CHARACTER_VOICES[0];

  // 1. Kullanıcının bu karakter için özel seçtiği ses varsa (localStorage)
  if (typeof window !== "undefined" && character.id) {
    try {
      const savedVoiceId = localStorage.getItem(`kael_voice_${character.id}`);
      if (savedVoiceId) {
        const foundSaved = CHARACTER_VOICES.find((v) => v.id === savedVoiceId);
        if (foundSaved) return foundSaved;
      }
    } catch {
      // ignore
    }
  }

  // 2. Doğrudan yeni ses ID'si atanmışsa
  if (character.voice_id) {
    const direct = CHARACTER_VOICES.find((v) => v.id === character.voice_id);
    if (direct) return direct;
  }

  const id = (character.id || "").toLowerCase();
  const name = (character.name || "").toLowerCase();
  const tags = (character.tags || []).map((t) => t.toLowerCase());

  // 3. Karakter bazlı akıllı eşleştirme
  if (id.includes("yuki") || name.includes("yuki")) {
    return CHARACTER_VOICES.find((v) => v.id === "anime-girl-yuki")!;
  }
  if (id.includes("aylin") || name.includes("aylin") || tags.includes("tsundere")) {
    return CHARACTER_VOICES.find((v) => v.id === "tsundere-aylin")!;
  }
  if (id.includes("aria") || name.includes("aria")) {
    return CHARACTER_VOICES.find((v) => v.id === "warm-woman-aria")!;
  }
  if (id.includes("leyla") || name.includes("leyla")) {
    return CHARACTER_VOICES.find((v) => v.id === "therapist-leyla")!;
  }
  if (id.includes("melis") || name.includes("melis") || id.includes("zeynep") || name.includes("zeynep")) {
    return CHARACTER_VOICES.find((v) => v.id === "gamer-girl-melis")!;
  }
  if (id.includes("lilith") || name.includes("lilith") || id.includes("luna") || name.includes("luna")) {
    return CHARACTER_VOICES.find((v) => v.id === "mystic-witch-lilith")!;
  }
  if (id.includes("selin") || name.includes("selin")) {
    return CHARACTER_VOICES.find((v) => v.id === "boss-woman-selin")!;
  }
  if (id.includes("nova") || name.includes("nova")) {
    return CHARACTER_VOICES.find((v) => v.id === "cyber-android-nova")!;
  }
  if (id.includes("boz") || name.includes("boz") || id.includes("kaptan") || name.includes("kaptan")) {
    return CHARACTER_VOICES.find((v) => v.id === "deep-boss-boz")!;
  }
  if (id.includes("baran") || name.includes("baran")) {
    return CHARACTER_VOICES.find((v) => v.id === "charismatic-baran")!;
  }
  if (id.includes("alparslan") || name.includes("alparslan") || id.includes("dungeon")) {
    return CHARACTER_VOICES.find((v) => v.id === "epic-warrior-alparslan")!;
  }
  if (id.includes("prof") || name.includes("prof") || id.includes("sinan") || id.includes("demirkan")) {
    return CHARACTER_VOICES.find((v) => v.id === "tr-aydin-mentor")!;
  }
  if (id.includes("kaito") || name.includes("kaito")) {
    return CHARACTER_VOICES.find((v) => v.id === "young-rebel-kaito")!;
  }

  // 4. Etiket veya kategoriye göre kadın / erkek ayrımı
  const isMale =
    tags.includes("erkek") ||
    tags.includes("komiser") ||
    tags.includes("mafya") ||
    tags.includes("profesör") ||
    tags.includes("korsan") ||
    character.voice_id === "ErXwobaYiN019PkySvjV" ||
    character.voice_id === "VR6AewLTigWG4xSOukaG" ||
    character.voice_id === "TxGEqnHWrfWFTfGW9XjX";

  if (character.category === "anime" && !isMale) {
    return CHARACTER_VOICES.find((v) => v.id === "anime-girl-yuki")!;
  }

  if (!isMale) {
    return CHARACTER_VOICES.find((v) => v.id === "tr-elif-natural")!;
  }

  return CHARACTER_VOICES.find((v) => v.id === "charismatic-baran")!;
}

// Konuşma metninden rol yapma yıldızlarını (*...*) ve LaTeX kodlarını temizle
export function cleanTextForSpeech(rawText: string, readActions = false): string {
  if (!rawText) return "";
  let text = rawText;

  if (!readActions) {
    // Sadece diyalogları oku (*eylem* kısımlarını çıkar)
    const withoutActions = text.replace(/\*[^*]+\*/g, " ").trim();
    // Eğer mesajın tamamı yıldız içindeyse yıldızları kaldırıp oku
    text = withoutActions.length > 4 ? withoutActions : text.replace(/\*/g, " ");
  } else {
    text = text.replace(/\*/g, " ");
  }

  return text
    .replace(/\$\$[\s\S]*?\$\$/g, " matematik formülü ")
    .replace(/\$[^$]+\$/g, " denklem ")
    .replace(/```[\s\S]*?```/g, " kod bloğu ")
    .replace(/[#_~`>|]/g, " ")
    .replace(/\(｡•́︿•̀｡\)|\(\^_\^\)|\(>_<\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
}

let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let activeAbortController: AbortController | null = null;
let activeAudioContext: AudioContext | null = null;

export type VoiceFilterId =
  | "normal"
  | "phone"
  | "radio"
  | "echo"
  | "anime_boost"
  | "deep_aura";

export interface VoiceFilterPreset {
  id: VoiceFilterId;
  label: string;
  icon: string;
  description: string;
}

export const VOICE_FILTER_PRESETS: VoiceFilterPreset[] = [
  {
    id: "normal",
    label: "Stüdyo Net",
    icon: "🎙️",
    description: "Saf ve berrak Neural stüdyo kalitesi",
  },
  {
    id: "phone",
    label: "Telefon Hattı",
    icon: "📞",
    description: "Gerçekçi cep telefonu araması akustik filtresi",
  },
  {
    id: "radio",
    label: "Polis / Kask Telsizi",
    icon: "📻",
    description: "Komiser, asker ve siber-zırh telsiz frekansı",
  },
  {
    id: "echo",
    label: "Gotik Şato Ekosu",
    icon: "🔮",
    description: "Büyücü, vampir ve zindan atmosferik yankısı",
  },
  {
    id: "anime_boost",
    label: "Canlı Anime (+Hız/Ton)",
    icon: "🌸",
    description: "Daha enerjik, tatlı ve hızlı anime tonlaması",
  },
  {
    id: "deep_aura",
    label: "Ağır & Karizmatik",
    icon: "⚡",
    description: "Daha ağırbaşlı, sakin ve derin konuşma temposu",
  },
];

export interface VoiceDspSettings {
  filterId: VoiceFilterId;
  speedRate: number; // 0.8 to 1.35
}

export function getVoiceDspSettings(): VoiceDspSettings {
  if (typeof window === "undefined") {
    return { filterId: "normal", speedRate: 1.0 };
  }
  try {
    const raw = localStorage.getItem("kael_voice_dsp_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        filterId: parsed.filterId || "normal",
        speedRate: typeof parsed.speedRate === "number" ? parsed.speedRate : 1.0,
      };
    }
  } catch {
    // ignore
  }
  return { filterId: "normal", speedRate: 1.0 };
}

export function saveVoiceDspSettings(settings: VoiceDspSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("kael_voice_dsp_settings", JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function stopNeuralVoice() {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // ignore
    }
    activeAbortController = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch {
      // ignore
    }
    activeAudioContext = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {
      // ignore
    }
    activeAudioUrl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export async function speakWithNeuralVoice(options: {
  text: string;
  voiceId?: string;
  filterOverride?: VoiceFilterId;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}): Promise<void> {
  const {
    text,
    voiceId = "anime-girl-yuki",
    filterOverride,
    onStart,
    onEnd,
    onError,
  } = options;
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    onEnd?.();
    return;
  }

  stopNeuralVoice();

  const dsp = getVoiceDspSettings();
  const activeFilter = filterOverride || dsp.filterId;

  const controller = new AbortController();
  activeAbortController = controller;

  try {
    const res = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned, voiceId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("TTS API yanıt vermedi");
    }

    const blob = await res.blob();
    if (controller.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    activeAudioUrl = url;

    const audio = new Audio(url);
    activeAudioElement = audio;

    // Speed & Tone Adjustment
    let rate = dsp.speedRate || 1.0;
    if (activeFilter === "anime_boost") {
      rate = Math.min(1.35, rate * 1.12);
      audio.preservesPitch = false;
    } else if (activeFilter === "deep_aura") {
      rate = Math.max(0.82, rate * 0.9);
      audio.preservesPitch = false;
    }
    audio.playbackRate = rate;

    // Apply Web Audio API Filter Chain if phone / radio / echo is active
    if (
      typeof window !== "undefined" &&
      (activeFilter === "phone" || activeFilter === "radio" || activeFilter === "echo")
    ) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        activeAudioContext = ctx;
        const source = ctx.createMediaElementSource(audio);

        if (activeFilter === "phone" || activeFilter === "radio") {
          const highpass = ctx.createBiquadFilter();
          highpass.type = "highpass";
          highpass.frequency.value = activeFilter === "radio" ? 520 : 340;

          const lowpass = ctx.createBiquadFilter();
          lowpass.type = "lowpass";
          lowpass.frequency.value = activeFilter === "radio" ? 2600 : 3200;

          const boost = ctx.createBiquadFilter();
          boost.type = "peaking";
          boost.frequency.value = 1400;
          boost.gain.value = activeFilter === "radio" ? 8 : 4;

          source.connect(highpass);
          highpass.connect(boost);
          boost.connect(lowpass);
          lowpass.connect(ctx.destination);
        } else if (activeFilter === "echo") {
          const delay = ctx.createDelay();
          delay.delayTime.value = 0.22;

          const feedback = ctx.createGain();
          feedback.gain.value = 0.32;

          const wetGain = ctx.createGain();
          wetGain.gain.value = 0.45;

          source.connect(ctx.destination);
          source.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(wetGain);
          wetGain.connect(ctx.destination);
        }
      } catch {
        // Fallback to direct playback if AudioContext fails
      }
    }

    audio.onplay = () => {
      onStart?.();
    };
    audio.onended = () => {
      stopNeuralVoice();
      onEnd?.();
    };
    audio.onerror = () => {
      stopNeuralVoice();
      onEnd?.();
    };

    await audio.play();
  } catch (err: unknown) {
    if (controller.signal.aborted) return;

    // Tarayıcı Web Speech API yedeği
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleaned);
        utter.lang = "tr-TR";
        const voiceOpt = CHARACTER_VOICES.find((v) => v.id === voiceId);
        if (voiceOpt?.gender === "female") {
          utter.pitch = 1.3;
          utter.rate = 1.06;
        } else {
          utter.pitch = 0.85;
          utter.rate = 0.96;
        }
        utter.onstart = () => onStart?.();
        utter.onend = () => onEnd?.();
        utter.onerror = () => onEnd?.();
        window.speechSynthesis.speak(utter);
        return;
      } catch {
        // ignore
      }
    }

    onError?.(err instanceof Error ? err.message : "Ses çalınamadı.");
    onEnd?.();
  }
}

