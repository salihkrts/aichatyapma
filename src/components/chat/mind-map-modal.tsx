"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Search,
  Heart,
  Backpack,
  Sparkles,
  Plus,
  Trash2,
  Send,
  X,
  Lock,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Character } from "@/types/database";
import type { RpgHudState } from "@/lib/rpg/rpg-engine";

interface MindMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character | null;
  memories: string[];
  affinityScore: number;
  hudState: RpgHudState;
  onAddMemory: (fact: string) => void;
  onRemoveMemory: (index: number) => void;
  onConfrontWithNode: (promptText: string) => void;
}

interface ClueNode {
  id: string;
  title: string;
  detail: string;
  tag: "Kanıt" | "Sır" | "Teori";
}

export function MindMapModal({
  open,
  onOpenChange,
  character,
  memories,
  affinityScore,
  hudState,
  onAddMemory,
  onRemoveMemory,
  onConfrontWithNode,
}: MindMapModalProps) {
  const [newNodeText, setNewNodeText] = useState("");
  const [newNodeType, setNewNodeType] = useState<"memory" | "clue">("clue");
  const [selectedNodeSummary, setSelectedNodeSummary] = useState<string | null>(null);
  const [clues, setClues] = useState<ClueNode[]>([
    {
      id: "clue-1",
      title: "Gizli Geçmiş İpucu",
      detail: character?.secrets
        ? character.secrets.slice(0, 120)
        : "Karakterin geçmişinde kimseye anlatmadığı kritik bir dönüm noktası var.",
      tag: "Sır",
    },
    {
      id: "clue-2",
      title: "Mekan Gözlemi",
      detail: `${hudState.location} bölgesinde olağandışı izler ve ipuçları tespit edildi.`,
      tag: "Kanıt",
    },
  ]);

  if (!open || !character) return null;

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeText.trim()) return;

    if (newNodeType === "memory") {
      onAddMemory(newNodeText.trim());
    } else {
      setClues((prev) => [
        ...prev,
        {
          id: `clue-${Date.now()}`,
          title: `Dedektif Notu #${prev.length + 1}`,
          detail: newNodeText.trim(),
          tag: "Kanıt",
        },
      ]);
    }
    setNewNodeText("");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border border-purple-500/40 bg-neutral-950 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-950/60 via-neutral-900 to-indigo-950/50">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Network className="size-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>🧠 Görsel Hafıza Haritası & Dedektif Kanıt Panosu</span>
                  <Badge className="bg-purple-500/20 text-purple-200 border border-purple-500/40 text-[10px]">
                    Canlı Sinir Ağı
                  </Badge>
                </h2>
                <p className="text-xs text-neutral-400">
                  {character.name} ile arandaki tüm anılar, keşfedilen sırlar, kanıtlar ve ilişki düğümleri
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Interactive Mind-Map Canvas */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.12)_0%,transparent_70%)]">
            {/* Top Neural Hub Visualization */}
            <div className="relative rounded-2xl border border-white/10 bg-neutral-900/60 p-5 overflow-hidden">
              {/* Decorative SVG Connection Lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-35"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="50%" y1="50%" x2="18%" y2="22%" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="82%" y2="22%" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="18%" y2="80%" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="82%" y2="80%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Left Satellites: Episodic Memories & Clues */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <Brain className="size-3.5 text-purple-400" />
                        Epizodik Anı Düğümleri ({memories.length})
                      </span>
                    </div>
                    {memories.length === 0 ? (
                      <p className="text-[11px] text-neutral-400">
                        Henüz kayıtlı anı düğümü yok. Aşağıdan yeni anı ekleyebilirsin.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {memories.map((m, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedNodeSummary(m)}
                            className="group flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/10 hover:border-purple-400/50 text-[11px] text-purple-100 cursor-pointer transition"
                          >
                            <span className="truncate">• {m}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveMemory(idx);
                              }}
                              className="text-neutral-500 hover:text-red-400"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-950/25 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <Search className="size-3.5 text-amber-400" />
                        Dedektif Kanıt & Sır Panosu ({clues.length})
                      </span>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {clues.map((clue) => (
                        <div
                          key={clue.id}
                          onClick={() => setSelectedNodeSummary(`${clue.title}: ${clue.detail}`)}
                          className="p-2.5 rounded-xl bg-black/40 border border-amber-500/25 hover:border-amber-400 text-[11px] cursor-pointer transition space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-200">{clue.title}</span>
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">
                              {clue.tag}
                            </Badge>
                          </div>
                          <p className="text-neutral-300 line-clamp-2">{clue.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CENTER NODE: Character Core */}
                <div className="flex flex-col items-center justify-center text-center py-4">
                  <div className="relative">
                    <span className="animate-ping absolute -inset-1 rounded-full bg-purple-500/20" />
                    <img
                      src={
                        character.avatar_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                      }
                      alt={character.name}
                      className="relative size-24 rounded-full object-cover border-2 border-purple-400 shadow-2xl"
                    />
                  </div>
                  <h3 className="mt-3 text-base font-extrabold text-white">{character.name}</h3>
                  <p className="text-[11px] text-purple-300 max-w-[220px] line-clamp-2 mt-0.5">
                    {character.tagline}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Badge className="bg-pink-500/20 text-pink-200 border border-pink-500/40 text-[10px]">
                      <Heart className="size-3 mr-1 fill-current" /> Bağ: {affinityScore}/100
                    </Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-[10px]">
                      📍 {hudState.location}
                    </Badge>
                  </div>
                </div>

                {/* Right Satellites: Hidden Lore Lock & Active Inventory Nodes */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl border border-pink-500/40 bg-pink-950/25 backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                        <Lock className="size-3.5 text-pink-400" />
                        Gizli Karakter Sırrı (Kilidi: 50+ Yakınlık)
                      </span>
                    </div>
                    {affinityScore >= 50 ? (
                      <div
                        onClick={() =>
                          setSelectedNodeSummary(
                            character.secrets ||
                              "Karakter sana en derin sırrını açmaya hazır: Geçmişteki büyük olayın asıl tanığı oydu."
                          )
                        }
                        className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-200 cursor-pointer"
                      >
                        🔓 <strong>Kilit Açıldı:</strong>{" "}
                        {character.secrets ||
                          "Seninle arasındaki bağ güçlendiği için gizli geçmiş dosyasını seninle paylaştı!"}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-neutral-400">
                        🔒 Bu düğümü açmak için yakınlık puanını <strong>50/100</strong> seviyesine çıkar (Şu an: {affinityScore}/100).
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl border border-cyan-500/40 bg-cyan-950/25 backdrop-blur-md space-y-2">
                    <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                      <Backpack className="size-3.5 text-cyan-400" />
                      Envanterdeki Fiziksel Kanıtlar ({hudState.inventory.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {hudState.inventory.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setSelectedNodeSummary(
                              `Envanter Eşyası: ${item.icon} ${item.name} (Adet: ${item.qty})`
                            )
                          }
                          className="px-2.5 py-1 rounded-xl bg-black/40 border border-cyan-500/30 hover:border-cyan-400 text-[11px] text-cyan-100 cursor-pointer transition"
                        >
                          {item.icon} {item.name} x{item.qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Node Action Bar (Confront in Chat!) */}
            {selectedNodeSummary && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-purple-400/50 bg-purple-950/40"
              >
                <div className="text-xs text-purple-100">
                  <span className="font-bold text-purple-300">Seçili Düğüm: </span>
                  <span>{selectedNodeSummary}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onConfrontWithNode(
                      `*Kanıt panosundaki şu detayı masaya koyup gözlerine bakarım: "${selectedNodeSummary}"* Bunun hakkında bana gerçeği anlatır mısın?`
                    );
                    onOpenChange(false);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                >
                  <Send className="size-3.5 mr-1.5" />
                  Bu Kanıtı / Anıyı Sohbette Yüzleştir!
                </Button>
              </motion.div>
            )}

            {/* Add New Memory or Clue Node Form */}
            <form
              onSubmit={handleAddNode}
              className="flex flex-col sm:flex-row items-center gap-2.5 p-4 rounded-2xl border border-white/10 bg-neutral-900/80"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setNewNodeType("clue")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    newNodeType === "clue"
                      ? "bg-amber-500/20 border-amber-400 text-amber-200"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                >
                  🔍 Kanıt / İpucu Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setNewNodeType("memory")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    newNodeType === "memory"
                      ? "bg-purple-500/20 border-purple-400 text-purple-200"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                >
                  🧠 Kalıcı Anı Ekle
                </button>
              </div>

              <Input
                value={newNodeText}
                onChange={(e) => setNewNodeText(e.target.value)}
                placeholder={
                  newNodeType === "clue"
                    ? "Yeni bir kanıt, şüphe veya sır düğümü yaz (Örn: Limandaki kamera kayıtları silinmiş)..."
                    : "Karakterin asla unutmaması gereken bir anı yaz..."
                }
                className="flex-1 bg-neutral-950 border-white/15 text-xs text-white rounded-xl h-9"
              />

              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl h-9 px-4 shrink-0 cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" /> Haritaya Bağla
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
