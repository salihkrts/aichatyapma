"use client";

import { useState, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FileText,
  Upload,
  BookOpen,
  EyeOff,
  MessageSquareCode,
  Sparkles,
  Trash2,
  CheckCircle2,
  Wand2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CharacterFormData } from "@/lib/validations/character";

interface ForgeLoreRagProps {
  form: UseFormReturn<CharacterFormData>;
}

interface UploadedDoc {
  name: string;
  size: number;
  type: string;
  status: "uploaded" | "processing";
}

export function ForgeLoreRag({ form }: ForgeLoreRagProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [customConcept, setCustomConcept] = useState("");
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const [autoWriteSuccess, setAutoWriteSuccess] = useState<string | null>(null);

  const allValues = watch();
  const systemPrompt = allValues.system_prompt || "";

  const handleAutoAnalyzeAndWrite = async () => {
    if (isAutoWriting) return;
    setIsAutoWriting(true);
    setAutoWriteSuccess(null);

    try {
      const ideaSeed =
        customConcept.trim() ||
        [allValues.name, allValues.tagline, allValues.avatar_prompt, allValues.description]
          .filter(Boolean)
          .join(" - ") ||
        "Özgün ve etkileyici bir rol yapma karakteri";

      const res = await fetch("/api/character-architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: ideaSeed,
          currentData: allValues,
        }),
      });

      const data = await res.json();
      if (res.ok && data.profile) {
        const p = data.profile;
        if (!allValues.name || allValues.name.trim().length < 2) {
          setValue("name", p.name, { shouldValidate: true });
        }
        if (!allValues.tagline || allValues.tagline.trim().length < 2) {
          setValue("tagline", p.tagline, { shouldValidate: true });
        }
        setValue("description", p.description, { shouldValidate: true });
        setValue("system_prompt", p.system_prompt, { shouldValidate: true });
        setValue("backstory", p.backstory, { shouldValidate: true });
        setValue("worldview", p.worldview, { shouldValidate: true });
        if (p.secrets) setValue("secrets", p.secrets, { shouldValidate: true });
        if (p.example_dialogues) {
          setValue("example_dialogues", p.example_dialogues, { shouldValidate: true });
        }
        if (p.greeting_message) {
          setValue("greeting_message", p.greeting_message, { shouldValidate: true });
        }
        if (Array.isArray(p.tags) && p.tags.length > 0 && (!allValues.tags || allValues.tags.length === 0)) {
          setValue("tags", p.tags, { shouldValidate: true });
        }
        setAutoWriteSuccess(
          "✨ Karakterin görseli, ismi ve kişilik ayarları analiz edildi; karakter tanımı, geçmiş hikayesi ve konuşma tarzı otomatik yazıldı!"
        );
      }
    } catch (err) {
      console.error("Otomatik hikaye yazma hatası:", err);
    } finally {
      setIsAutoWriting(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/characters/knowledge", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setDocuments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.name.split(".").pop() || "txt",
            status: "uploaded",
          },
        ]);
      } else {
        alert(json.error || "Belge yüklenemedi");
      }
    } catch (err) {
      console.error("Belge yükleme hatası:", err);
      alert("Belge yüklenirken bir sorun oluştu");
    } finally {
      setIsUploading(false);
    }
  };

  const removeDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* AI Otomatik Karakter Tanımlaması & Hikaye Yazıcı */}
      <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/50 via-pink-950/30 to-neutral-900/80 p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Wand2 className="size-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Otomatik Karakter Tanımlaması & Hikaye Oluşturucu
              </h3>
              <p className="text-[11px] text-neutral-300">
                İster aşağıdaki alanları kendin yaz, ister tek tuşla yapay zekaya analiz ettirip otomatik yazdır!
              </p>
            </div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30 text-[10px] w-fit">
            Kişilik & Görsel Analizli
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            value={customConcept}
            onChange={(e) => setCustomConcept(e.target.value)}
            placeholder={
              allValues.avatar_prompt || allValues.name
                ? `Mevcut: "${allValues.name || allValues.avatar_prompt}" (Ek detay yazabilirsin: örn. polis bir ayı, sert komiser...)`
                : "Örn: Polis bir ayı, cinayet masası başkomiseri, bal ve kahve tiryakisi..."
            }
            className="bg-black/50 border-white/15 text-white placeholder:text-neutral-400 text-xs h-10 rounded-xl flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAutoAnalyzeAndWrite();
              }
            }}
          />
          <Button
            type="button"
            disabled={isAutoWriting}
            onClick={handleAutoAnalyzeAndWrite}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl h-10 px-5 shrink-0 shadow-lg shadow-purple-600/25"
          >
            {isAutoWriting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Analiz Edip Yazıyor...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                ✨ Otomatik Analiz Et & Hikaye Yaz
              </>
            )}
          </Button>
        </div>

        {autoWriteSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            <span>{autoWriteSuccess}</span>
          </div>
        )}
      </div>

      {/* System Prompt (Core Behavioral Directive) */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-400" />
            <Label htmlFor="system_prompt" className="text-sm font-semibold text-white">
              Karakter Tanımı & Konuşma Tarzı (Sistem İstemi) <span className="text-purple-400">*</span>
            </Label>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {systemPrompt.length} / 8000 karakter
          </span>
        </div>
        <p className="text-xs text-neutral-400 mb-3">
          Karakterin kim olduğunu, nasıl konuştuğunu, hangi kelimeleri kullandığını ve sana nasıl hitap edeceğini belirler. Kendin yazabilir veya yukarıdaki butonla otomatik oluşturabilirsin.
        </p>
        <Textarea
          id="system_prompt"
          {...register("system_prompt")}
          rows={5}
          placeholder="Örn: Sen Komiser Pençe'sin; şehrin en tecrübeli polis ayısısın. Kalın sesli, babacan ama suçlulara karşı acımasızsın. Konuşurken sokak ve polis jargonu kullanır, *rozetini düzeltip havayı koklar* gibi hareketler yaparsın..."
          className="bg-black/40 border-white/10 text-white font-mono text-xs leading-relaxed placeholder:text-neutral-600 rounded-xl"
        />
        {errors.system_prompt && (
          <p className="mt-1.5 text-xs text-red-400">{errors.system_prompt.message}</p>
        )}
      </div>

      {/* Backstory & Worldview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="backstory" className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <BookOpen className="size-4 text-blue-400" />
            Karakter Hikayesi & Geçmişi
          </Label>
          <p className="text-[11px] text-neutral-400 mt-1 mb-2">
            Nerede doğdu, geçmişinde neler yaşadı, onu bugünkü haline ne getirdi?
          </p>
          <Textarea
            id="backstory"
            {...register("backstory")}
            rows={4}
            placeholder="Örn: Kuzey ormanlarından şehre gelip Polis Akademisini birincilikle bitirdi. 15 yıldır gece vardiyasında en zorlu dosyaları çözüyor..."
            className="bg-white/[0.03] border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="worldview" className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-400" />
            Dünya Görüşü & İlkeleri
          </Label>
          <p className="text-[11px] text-neutral-400 mt-1 mb-2">
            Hayata bakışı, değerleri, adalet anlayışı veya inançları nelerdir?
          </p>
          <Textarea
            id="worldview"
            {...register("worldview")}
            rows={4}
            placeholder="Örn: Kanunlar kağıt üstündedir ama gerçek adalet sokakta masumu korumaktır..."
            className="bg-white/[0.03] border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
          />
        </div>
      </div>

      {/* Greeting Message right inside Lore tab for convenience */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
        <Label htmlFor="greeting_message_lore" className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageCircle className="size-4 text-pink-400" />
          İlk Karşılama & Tanışma Cümlesi <span className="text-purple-400">*</span>
        </Label>
        <p className="text-xs text-neutral-400 mt-1 mb-2">
          Sohbet başladığında karakterin sana söyleyeceği ilk sahne ve açılış mesajı.
        </p>
        <Textarea
          id="greeting_message_lore"
          {...register("greeting_message")}
          rows={3}
          placeholder="*Polis şapkasını hafifçe yukarı kaldırıp elindeki kahve kupasını masaya bırakır* Karakoluma hoş geldin ortak. Bu saatte buraya geldiğine göre sıradan bir mesele değil. Anlat bakalım, neyin peşindeyiz?"
          className="bg-black/40 border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
        />
      </div>

      {/* Hidden Secrets & Few-shot Dialogues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="secrets" className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <EyeOff className="size-4 text-red-400" />
            Gizli Sırlar (Güven Kazanınca Açacağı Detaylar)
          </Label>
          <p className="text-[11px] text-neutral-400 mt-1 mb-2">
            Karakterin bildiği ama sadece yakınlık seviyesi arttığında paylaşacağı gizemler.
          </p>
          <Textarea
            id="secrets"
            {...register("secrets")}
            rows={4}
            placeholder="Örn: Çekmecesinde her zaman küçük bir kavanoz kestane balı saklar ve eski ortağının çözülmemiş dosyasını gizlice araştırır..."
            className="bg-white/[0.03] border-white/10 text-white text-xs placeholder:text-neutral-600 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="example_dialogues" className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <MessageSquareCode className="size-4 text-emerald-400" />
            Örnek Konuşma Kalıbı
          </Label>
          <p className="text-[11px] text-neutral-400 mt-1 mb-2">
            Nasıl cevap vermesini istiyorsan bir konuşma örneği ekleyebilirsin.
          </p>
          <Textarea
            id="example_dialogues"
            {...register("example_dialogues")}
            rows={4}
            placeholder={`<START>\n{{user}}: Komiserim bu izleri nasıl buldun?\n{{char}}: *İri pençesiyle polis rozetini düzeltip burnunu çeker* Evlat, bir boz ayının burnundan ne barut kokusu kaçar ne de yalan!`}
            className="bg-white/[0.03] border-white/10 text-white font-mono text-xs placeholder:text-neutral-600 rounded-xl"
          />
        </div>
      </div>

      {/* Custom Knowledge Base (RAG) */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">
              Özel Bilgi Tabanı (PDF, TXT, Markdown Yükleme)
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30">
            Vektör Tabanlı Bellek
          </Badge>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Karakterin bir kitap, oyun dünyası veya özel bir uzmanlık bilmesini istiyorsan PDF veya TXT dosyası yükleyebilirsin.
        </p>

        {/* Upload dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-xl p-6 text-center cursor-pointer bg-neutral-950/40 hover:bg-neutral-950/60 transition-all duration-300"
        >
          <Upload className="size-7 text-neutral-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-neutral-200">
            Dosya yüklemek için buraya tıkla
          </p>
          <p className="text-[10px] text-neutral-500 mt-1">
            Desteklenen formatlar: PDF, TXT, MD, JSON (Maksimum 25MB)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.json"
          onChange={handleDocumentUpload}
          className="hidden"
        />

        {isUploading && (
          <p className="text-xs font-mono text-cyan-400 mt-2 text-center animate-pulse">
            Belge okunuyor ve vektör hafızasına işleniyor...
          </p>
        )}

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="mt-4 space-y-2">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/60 border border-white/10 text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-cyan-400" />
                  <div>
                    <p className="font-medium text-white">{doc.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {(doc.size / 1024).toFixed(1)} KB • {doc.type.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <CheckCircle2 className="size-3.5" /> Hazır
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    className="text-neutral-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
