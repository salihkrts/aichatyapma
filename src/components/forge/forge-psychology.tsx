"use client";

import { UseFormReturn } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Wand2, PenTool, Loader2 } from "lucide-react";
import type { CharacterFormData } from "@/lib/validations/character";

interface ForgePsychologyProps {
  form: UseFormReturn<CharacterFormData>;
  onAutoGenerateLore?: () => void;
  onGoToLore?: () => void;
  isGeneratingLore?: boolean;
}

interface TraitConfig {
  key: keyof CharacterFormData;
  name: string;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
  colorClass: string;
  description: string;
}

const TRAITS: TraitConfig[] = [
  {
    key: "trait_empathy",
    name: "Empati & Duygusal Derinlik",
    lowLabel: "Soğuk & Mantıksal",
    midLabel: "Dengeli & Anlayışlı",
    highLabel: "Çok Şefkatli & Hassas",
    colorClass: "from-blue-500 to-cyan-400",
    description: "Karakterin senin duygularına ne kadar ortak olacağını ve teselli edeceğini belirler.",
  },
  {
    key: "trait_humor",
    name: "Mizah & Espri Yeteneği",
    lowLabel: "Ciddi & Ağırbaşlı",
    midLabel: "Esprili & Samimi",
    highLabel: "Sürekli Şakacı & Alaycı",
    colorClass: "from-amber-500 to-yellow-400",
    description: "Karakterin espriler, laf sokmalar ve neşeli tepkiler verme sıklığını ayarlar.",
  },
  {
    key: "trait_aggression",
    name: "Sertlik & Baskınlık",
    lowLabel: "Uysal & Barışçıl",
    midLabel: "Kararlı & Kendinden Emin",
    highLabel: "Asi & Dövüşken",
    colorClass: "from-red-500 to-rose-400",
    description: "Karakterin tartışmalarda sert çıkış yapıp yapmayacağını ve meydan okuma seviyesini belirler.",
  },
  {
    key: "trait_formality",
    name: "Resmiyet & Konuşma Üslubu",
    lowLabel: "Sokak Ağzı / Samimi",
    midLabel: "Düzgün & Nezaketli",
    highLabel: "Ağırbaşlı & Asil",
    colorClass: "from-indigo-500 to-violet-400",
    description: "Cümle uzunluğu, seçilen kelimelerin ağırlığı ve hitap şeklini şekillendirir.",
  },
  {
    key: "trait_creativity",
    name: "Yaratıcılık & Hayal Gücü",
    lowLabel: "Somut & Düz Mantık",
    midLabel: "Özgün & İlham Verici",
    highLabel: "Sonsuz Hayalperest",
    colorClass: "from-purple-500 to-pink-400",
    description: "Karakterin sıra dışı fikirler üretme, metaforlar ve hikaye kurma gücünü kontrol eder.",
  },
  {
    key: "trait_curiosity",
    name: "Merak & Seni Tanıma İsteği",
    lowLabel: "Kendi Halinde",
    midLabel: "İlgili Dinleyici",
    highLabel: "Çok Meraklı Soru Yağmuru",
    colorClass: "from-emerald-500 to-teal-400",
    description: "Senin hakkında yeni sorular sorup hayatını ne kadar merak edeceğini belirler.",
  },
  {
    key: "trait_confidence",
    name: "Özgüven & Liderlik",
    lowLabel: "Çekingen & Utangaç",
    midLabel: "Rahat & Güvenli",
    highLabel: "Kusursuz Özgüvenli",
    colorClass: "from-orange-500 to-amber-400",
    description: "Karakterin utangaç mı yoksa kendinden son derece emin bir lider mi olacağını ayarlar.",
  },
  {
    key: "trait_warmth",
    name: "Sıcakkanlılık & Sevgi",
    lowLabel: "Mesafeli & Gizemli",
    midLabel: "Dostane & Samimi",
    highLabel: "Aşırı Sevgi Dolu & Yakın",
    colorClass: "from-pink-500 to-rose-400",
    description: "Sana karşı ne kadar çabuk bağlanacağını ve sıcak bir bağ kuracağını belirler.",
  },
];

export function ForgePsychology({
  form,
  onAutoGenerateLore,
  onGoToLore,
  isGeneratingLore,
}: ForgePsychologyProps) {
  const { watch, setValue } = form;

  const getSemanticLabel = (val: number, trait: TraitConfig) => {
    if (val <= 33) return trait.lowLabel;
    if (val <= 66) return trait.midLabel;
    return trait.highLabel;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-950/20 flex items-start gap-3">
        <Brain className="size-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">
            Karakter Kişilik Ayarları (8 Boyutlu Zeka Matrisi)
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Kaydırıcıları sağa-sola çekerek karakterinin ruh halini belirle. Hemen aşağıdan bu kişiliğe uygun otomatik hikaye ve karakter tanımı yazdırabilirsin!
          </p>
        </div>
      </div>

      {/* Traits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TRAITS.map((trait) => {
          const value = (watch(trait.key) as number) ?? 50;
          const semantic = getSemanticLabel(value, trait);

          return (
            <div
              key={trait.key}
              className="p-4 rounded-2xl border border-white/10 bg-neutral-900/60 backdrop-blur-md space-y-3 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold text-white block">
                    {trait.name}
                  </Label>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {trait.description}
                  </p>
                </div>
                <span className="font-mono text-sm font-extrabold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                  %{value}
                </span>
              </div>

              {/* Slider */}
              <div className="pt-1">
                <Slider
                  value={[value]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(vals) => {
                    const nextVal = typeof vals === "number" ? vals : vals[0];
                    setValue(trait.key, nextVal, { shouldValidate: true });
                  }}
                  className="cursor-pointer"
                />
              </div>

              {/* Semantic Status Badge */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                <span className="text-neutral-500 text-[10px]">
                  0: {trait.lowLabel.split(" ")[0]}
                </span>
                <span className="text-purple-300 font-semibold bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/5">
                  {semantic}
                </span>
                <span className="text-neutral-500 text-[10px]">
                  100: {trait.highLabel.split(" ")[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kişilik Sonrası Otomatik Karakter Tanımı & Hikaye Kutusu */}
      <div className="p-5 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/50 via-pink-950/30 to-neutral-900/80 shadow-xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/30">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Kişilikten Sonra: Karakter Tanımı & Hikayesi
            </h4>
            <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
              Belirlediğin görsel, isim ve kişilik oranlarına göre yapay zeka karakterini otomatik analiz edip ona özel bir geçmiş hikayesi, konuşma tarzı ve karakter tanımı yazabilir ya da kendin yazabilirsin!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {onAutoGenerateLore && (
            <Button
              type="button"
              disabled={isGeneratingLore}
              onClick={onAutoGenerateLore}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl h-10 px-5 shadow-lg shadow-purple-600/25"
            >
              {isGeneratingLore ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Analiz Ediliyor & Hikaye Yazılıyor...
                </>
              ) : (
                <>
                  <Wand2 className="size-4 mr-2" />
                  ✨ Otomatik Analiz Et & Karakter Hikayesi Yaz
                </>
              )}
            </Button>
          )}

          {onGoToLore && (
            <Button
              type="button"
              variant="outline"
              onClick={onGoToLore}
              className="border-white/15 bg-white/[0.04] hover:bg-white/10 text-white text-xs rounded-xl h-10 px-4"
            >
              <PenTool className="size-3.5 mr-2 text-purple-300" />
              Kendim Yazacağım / Düzenle
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
