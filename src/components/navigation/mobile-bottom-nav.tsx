"use client";

import React from "react";
import {
  Compass,
  MessageSquare,
  PlusCircle,
  Users,
  ShoppingBag,
  UserCircle,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: "explore" | "chat" | "forge" | "groups" | "store" | "profile" | "admin") => void;
  isViewerAdmin?: boolean;
  hasActiveCharacter?: boolean;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  isViewerAdmin = false,
  hasActiveCharacter = false,
}: MobileBottomNavProps) {
  // Chat ekranındayken klavye ve mesaj alanı için alt barı gizle (ChatHeader geri tuşu mevcuttur)
  if (activeTab === "chat") {
    return null;
  }

  const navItems = [
    {
      id: "explore" as const,
      label: "Keşfet",
      icon: Compass,
    },
    {
      id: "chat" as const,
      label: "Sohbet",
      icon: MessageSquare,
      hasDot: hasActiveCharacter,
    },
    {
      id: "forge" as const,
      label: "Atölye",
      icon: PlusCircle,
      highlight: true,
    },
    {
      id: "groups" as const,
      label: "Gruplar",
      icon: Users,
    },
    {
      id: "store" as const,
      label: "Mağaza",
      icon: ShoppingBag,
    },
    {
      id: "profile" as const,
      label: "Profil",
      icon: UserCircle,
    },
    ...(isViewerAdmin
      ? [
          {
            id: "admin" as const,
            label: "Admin",
            icon: Crown,
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Mobil Gezinme Menüsü"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-neutral-950/90 backdrop-blur-2xl border-t border-purple-500/20 pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-1.5 px-2 select-none shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className="relative flex flex-col items-center justify-center py-1 px-2 min-w-[50px] transition-all cursor-pointer active:scale-95 group"
            >
              {/* Active Indicator Glow Background */}
              {isActive && (
                <motion.div
                  layoutId="mobileNavActivePill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-500/20 to-pink-500/10 border border-purple-500/30"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    item.highlight && !isActive
                      ? "text-purple-300"
                      : isActive
                      ? "text-white"
                      : "text-neutral-400 group-hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`size-5 transition-transform ${
                      isActive ? "scale-110 text-purple-300" : ""
                    }`}
                  />
                  {item.hasDot && (
                    <span className="absolute top-1 right-2.5 size-2 rounded-full bg-emerald-400 ring-2 ring-neutral-950" />
                  )}
                </div>

                <span
                  className={`text-[10px] font-semibold tracking-tight transition-colors ${
                    isActive
                      ? "text-purple-200 font-bold"
                      : "text-neutral-400 group-hover:text-neutral-300"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
