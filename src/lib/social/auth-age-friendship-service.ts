/**
 * KAEL-AI BACKEND SECURITY, AGE-GATE NSFW GUARD, GUEST UPGRADE & FRIENDSHIP/BLOCK SERVICE
 */

export interface AuthSessionPayload {
  userId: string;
  username: string;
  displayName: string;
  email?: string | null;
  birthDate?: string | null; // YYYY-MM-DD
  isGuest: boolean;
  isAdult: boolean;
  nsfwEnabled: boolean;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  joinedAt: string;
}

export interface UserPersonaItem {
  id: string;
  name: string;       // {{user}}
  backstory: string;  // Persona Lore & Traits
  avatarUrl: string;
  isDefault: boolean;
}

export type SocialRelationStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | "BLOCKED";

export interface SocialUserRecord {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  coverUrl: string;
  bio: string;
  joinedAt: string;
  relationStatus: SocialRelationStatus;
  followersCount: number;
  friendsCount: number;
}

/**
 * 1. DYNAMIC AGE CALCULATION & STRICT SFW ENFORCEMENT
 * Calculates exact age in years from YYYY-MM-DD birth date.
 */
export function calculateExactAge(birthDateIso?: string | null): number {
  if (!birthDateIso) return 0;
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Backend / Middleware Guard:
 * If viewer is Guest OR under 18, `isAdult` and `nsfwEnabled` are strictly locked to `false`.
 * Even if an API request passes `?includeNsfw=true`, this guard overrides it to `false`.
 */
export function resolveViewerSafetyContext(session: Partial<AuthSessionPayload> | null): {
  isGuest: boolean;
  age: number;
  isAdult: boolean;
  canViewNsfw: boolean;
  sqlWhereClause: string;
} {
  if (!session || session.isGuest) {
    return {
      isGuest: true,
      age: 0,
      isAdult: false,
      canViewNsfw: false,
      sqlWhereClause: "AND b.is_nsfw = FALSE",
    };
  }

  const age = calculateExactAge(session.birthDate);
  const isAdult = age >= 18;
  const canViewNsfw = isAdult && Boolean(session.nsfwEnabled);

  return {
    isGuest: false,
    age,
    isAdult,
    canViewNsfw,
    sqlWhereClause: canViewNsfw ? "" : "AND b.is_nsfw = FALSE",
  };
}

/**
 * Filters any array of bots/characters according to viewer's Age-Gate & Block list.
 */
export function filterBotsByAgeGateAndBlockList<
  T extends { is_nsfw?: boolean; is_public?: boolean; creator_id?: string }
>(
  bots: T[],
  viewerSession: Partial<AuthSessionPayload> | null,
  blockedCreatorIds: string[] = [],
  profileOwnerId?: string
): T[] {
  const safety = resolveViewerSafetyContext(viewerSession);
  const viewerId = viewerSession?.userId;

  return bots.filter((bot) => {
    // 1. Block isolation: never show bots from blocked users
    if (bot.creator_id && blockedCreatorIds.includes(bot.creator_id)) {
      return false;
    }
    // 2. Visibility rule: visitors only see PUBLIC bots; owner sees both PUBLIC and PRIVATE
    if (profileOwnerId && viewerId !== profileOwnerId && bot.is_public === false) {
      return false;
    }
    // 3. Strict Age-Gate NSFW enforcement
    if (bot.is_nsfw && !safety.canViewNsfw) {
      return false;
    }
    return true;
  });
}

/**
 * 2. GUEST SESSION & ACCOUNT UPGRADE (Preserves History, Personas & Saved Bots)
 */
export function createInitialGuestSession(): AuthSessionPayload {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return {
    userId: `guest-${Date.now()}`,
    username: `misafir_${randomSuffix}`,
    displayName: `Misafir Gezgin #${randomSuffix}`,
    email: null,
    birthDate: null,
    isGuest: true,
    isAdult: false,
    nsfwEnabled: false,
    avatarUrl: "/avatars/yuki.jpg",
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1500&auto=format&fit=crop&q=80",
    bio: "Kael-AI dünyasını misafir modunda keşfediyor. (18+ içerikler ve arkadaş ekleme kapalıdır)",
    joinedAt: new Date().toISOString(),
  };
}

export function upgradeGuestToRegisteredAccount(
  currentSession: AuthSessionPayload,
  params: {
    email: string;
    username: string;
    displayName: string;
    birthDate: string;
  }
): AuthSessionPayload {
  const age = calculateExactAge(params.birthDate);
  const isAdult = age >= 18;

  return {
    ...currentSession,
    email: params.email.trim(),
    username: params.username.replace(/^@/, "").trim().toLowerCase(),
    displayName: params.displayName.trim(),
    birthDate: params.birthDate,
    isGuest: false,
    isAdult,
    // Keep NSFW false by default unless user is 18+ and toggles it on
    nsfwEnabled: isAdult ? currentSession.nsfwEnabled : false,
    bio:
      currentSession.bio.includes("misafir modunda")
        ? "Kael-AI Rol Yapma ve Karakter Evreni Üyesi ✨"
        : currentSession.bio,
  };
}

/**
 * 3. GROUP CHAT BLOCKED USER MESSAGE MASKING
 * In shared group chats, messages from blocked users are masked automatically.
 */
export function maskBlockedUserMessage<
  T extends { speaker_id: string; speaker_name: string; content: string }
>(message: T, blockedUserIds: string[]): T & { isBlockedMasked?: boolean } {
  if (blockedUserIds.includes(message.speaker_id)) {
    return {
      ...message,
      speaker_name: "Engellenen Kullanıcı",
      content: "🚫 Engellenen bir kullanıcının mesajı (Gizlendi)",
      isBlockedMasked: true,
    };
  }
  return message;
}
