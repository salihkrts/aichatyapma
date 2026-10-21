"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface VisualFxOverlayProps {
  activeTab: string;
  soundFxEnabled?: boolean;
}

const BURST_COLORS = [
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
];

function playUiSynthClick(type: "click" | "warp" = "click") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.055);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.065);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 300);
  } catch {
    // ignore audio context restrictions
  }
}

export function VisualFxOverlay({
  activeTab,
  soundFxEnabled = true,
}: VisualFxOverlayProps) {
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const [warpKey, setWarpKey] = useState<string | null>(null);

  // Trigger page warp sweep on tab change
  useEffect(() => {
    setWarpKey(`${activeTab}-${Date.now()}`);
    if (soundFxEnabled) {
      playUiSynthClick("warp");
    }
    const timer = setTimeout(() => setWarpKey(null), 550);
    return () => clearTimeout(timer);
  }, [activeTab, soundFxEnabled]);

  const spawnBurst = useCallback(
    (x: number, y: number, isInteractive: boolean) => {
      const id = Date.now() + Math.random();
      const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      setBursts((prev) => [...prev.slice(-8), { id, x, y, color }]);

      if (isInteractive && soundFxEnabled) {
        playUiSynthClick("click");
      }

      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 650);
    },
    [soundFxEnabled]
  );

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest("button, a, [role='button'], input[type='submit']")
      );
      spawnBurst(e.clientX, e.clientY, isInteractive);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl.tagName === "BUTTON") {
          const rect = activeEl.getBoundingClientRect();
          spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
        }
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [spawnBurst]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {/* Page Transition Portal Sweep */}
      <AnimatePresence>
        {warpKey && (
          <motion.div
            key={warpKey}
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top Laser Sweep Line */}
            <motion.div
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: 0 }}
              transition={{ duration: 0.48, ease: "circOut" }}
              className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-400 to-amber-400 shadow-[0_0_25px_rgba(236,72,153,0.9)]"
            />
            {/* Subtle Ambient Radial Pulse */}
            <div className="w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.16),transparent_65%)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click Ripple & Sparkle Bursts */}
      {bursts.map((burst) => (
        <div
          key={burst.id}
          style={{ left: burst.x, top: burst.y }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          {/* Expanding Ring */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ borderColor: burst.color }}
            className="size-8 rounded-full border-2 shadow-[0_0_12px_currentColor]"
          />

          {/* 6 Radial SparkParticles */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const tx = Math.cos(rad) * 28;
            const ty = Math.sin(rad) * 28;
            return (
              <motion.span
                key={angle}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{ x: tx, y: ty, scale: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ backgroundColor: burst.color }}
                className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
