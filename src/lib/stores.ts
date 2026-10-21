import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Character, Profile } from "@/types/database";

// ============================================================
// UI Store: Theme, sidebar, modals
// ============================================================
interface UIState {
  theme: "dark" | "light" | "system";
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  activeModal: string | null;

  setTheme: (theme: "dark" | "light" | "system") => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      sidebarOpen: true,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      activeModal: null,

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setActiveModal: (modal) => set({ activeModal: modal }),
    }),
    {
      name: "neural-nexus-ui",
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// ============================================================
// Character Store: Active character context
// ============================================================
interface CharacterState {
  activeCharacter: Character | null;
  recentCharacters: Character[];

  setActiveCharacter: (character: Character | null) => void;
  addRecentCharacter: (character: Character) => void;
  clearRecentCharacters: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      activeCharacter: null,
      recentCharacters: [],

      setActiveCharacter: (character) => {
        set({ activeCharacter: character });
        if (character) {
          get().addRecentCharacter(character);
        }
      },

      addRecentCharacter: (character) =>
        set((state) => {
          const filtered = state.recentCharacters.filter(
            (c) => c.id !== character.id
          );
          return {
            recentCharacters: [character, ...filtered].slice(0, 10),
          };
        }),

      clearRecentCharacters: () => set({ recentCharacters: [] }),
    }),
    {
      name: "neural-nexus-character",
      partialize: (state) => ({
        recentCharacters: state.recentCharacters,
      }),
    }
  )
);

// ============================================================
// Auth Store: Current user profile
// ============================================================
interface AuthState {
  profile: Profile | null;
  isLoading: boolean;

  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  profile: null,
  isLoading: true,

  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ============================================================
// Chat Store: Active chat state
// ============================================================
interface ChatState {
  activeChatId: string | null;
  isStreaming: boolean;
  editingMessageId: string | null;
  replyToMessageId: string | null;

  setActiveChatId: (id: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  setEditingMessageId: (id: string | null) => void;
  setReplyToMessageId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeChatId: null,
  isStreaming: false,
  editingMessageId: null,
  replyToMessageId: null,

  setActiveChatId: (id) => set({ activeChatId: id }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setReplyToMessageId: (id) => set({ replyToMessageId: id }),
}));
