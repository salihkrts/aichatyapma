"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  GitBranch,
  Bot,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatWithCharacter } from "@/types/database";

interface ChatSidebarProps {
  chats: ChatWithCharacter[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpenMobile = false,
  onCloseMobile,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredChats = chats.filter((c) => {
    const titleMatch = (c.title || "").toLowerCase().includes(search.toLowerCase());
    const charMatch = (c.characters?.name || "").toLowerCase().includes(search.toLowerCase());
    return titleMatch || charMatch;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      <aside
        className={`flex flex-col h-full border-r border-white/10 bg-neutral-950/95 md:bg-neutral-950/70 backdrop-blur-2xl transition-all duration-300 ${
          isOpenMobile
            ? "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl flex"
            : "hidden md:flex relative z-20 " +
              (isCollapsed ? "md:w-16" : "md:w-72 sm:md:w-80")
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Sparkles className="size-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                Nexus Timelines
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {isOpenMobile && onCloseMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseMobile}
                className="md:hidden size-7 text-neutral-400 hover:text-white"
              >
                <X className="size-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex size-7 text-neutral-400 hover:text-white"
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action: New Chat */}
        <div className="p-3">
          <Button
            onClick={() => {
              onNewChat();
              if (onCloseMobile) onCloseMobile();
            }}
          className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 ${
            isCollapsed ? "px-0 justify-center" : "justify-start gap-2"
          }`}
        >
          <Plus className="size-4 shrink-0" />
          {!isCollapsed && <span>New Session</span>}
        </Button>
      </div>

      {/* Search Input */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-neutral-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-8 text-xs bg-white/[0.03] border-white/10 h-8 text-white placeholder:text-neutral-600"
            />
          </div>
        </div>
      )}

      {/* Chats List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 py-1">
          {filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isBranched = Boolean(chat.parent_chat_id);

            return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-purple-600/20 text-white border border-purple-500/30"
                    : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                }`}
              >
                {/* Character avatar */}
                <Avatar className="size-8 shrink-0 border border-white/10">
                  <AvatarImage
                    src={chat.characters?.avatar_url || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-neutral-900 text-purple-300 text-[10px]">
                    <Bot className="size-3.5" />
                  </AvatarFallback>
                </Avatar>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white truncate">
                        {chat.characters?.name || "Persona"}
                      </p>
                      {chat.last_message_at && (
                        <span className="text-[9px] text-neutral-500 shrink-0">
                          {formatDistanceToNow(new Date(chat.last_message_at), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {chat.title || "Conversation"}
                    </p>

                    {isBranched && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-cyan-400 font-mono">
                        <GitBranch className="size-2.5" />
                        <span className="truncate">{chat.branch_label || "Fork"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete button on hover */}
                {!isCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation timeline?")) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 size-6 rounded-md hover:bg-red-500/20 text-neutral-500 hover:text-red-400 flex items-center justify-center transition"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}

          {filteredChats.length === 0 && !isCollapsed && (
            <div className="p-6 text-center text-xs text-neutral-500">
              No conversations found.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Link to Dashboard */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/"
          className={`flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/[0.04] transition ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <Bot className="size-4 text-purple-400" />
          {!isCollapsed && <span>Explore Characters</span>}
        </Link>
      </div>
    </aside>
    </>
  );
}
