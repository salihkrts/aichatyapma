-- ============================================================================
-- KAEL-AI LAYER 4: AUTH & GUEST SYSTEM, DYNAMIC AGE-GATE (NSFW GUARD),
-- MULTI-PERSONA ENGINE, RICH PROFILE SHOWCASE & FRIENDSHIP/BLOCK ISOLATION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. USER TABLE (Auth, Guest UUID, Dynamic Age Calculation & Strict SFW Lock)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE, -- Nullable for Guest accounts until upgraded
  username VARCHAR(50) UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name VARCHAR(100) NOT NULL,
  password_hash TEXT,        -- Argon2id / Bcrypt hash (NULL for Guest accounts)
  guest_uuid UUID UNIQUE,    -- Populated when user selects "Continue as Guest"
  avatar_url TEXT DEFAULT '/avatars/yuki.jpg',
  cover_url TEXT DEFAULT 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1500&auto=format&fit=crop&q=80',
  bio TEXT DEFAULT '',
  birth_date DATE,           -- Mandatory on Register & Guest Upgrade
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  is_adult BOOLEAN NOT NULL DEFAULT FALSE,
  nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_message_quota INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Strict database-level invariant: Minors and Guests can NEVER enable NSFW!
  CONSTRAINT chk_strict_sfw_for_minors_and_guests
    CHECK (
      (is_guest = FALSE AND is_adult = TRUE)
      OR (nsfw_enabled = FALSE)
    )
);

CREATE INDEX idx_users_username_trgm ON public.users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_display_name_trgm ON public.users USING gin (display_name gin_trgm_ops);
CREATE INDEX idx_users_guest_uuid ON public.users(guest_uuid) WHERE is_guest = TRUE;

-- Trigger: Automatically compute `is_adult` from `birth_date` and lock `nsfw_enabled = FALSE` if < 18 or Guest
CREATE OR REPLACE FUNCTION public.enforce_user_age_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_age INT;
BEGIN
  IF NEW.is_guest = TRUE OR NEW.birth_date IS NULL THEN
    NEW.is_adult := FALSE;
    NEW.nsfw_enabled := FALSE;
  ELSE
    v_age := EXTRACT(YEAR FROM age(current_date, NEW.birth_date))::INT;
    IF v_age < 18 THEN
      NEW.is_adult := FALSE;
      NEW.nsfw_enabled := FALSE;
    ELSE
      NEW.is_adult := TRUE;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_user_age_gate ON public.users;
CREATE TRIGGER trg_enforce_user_age_gate
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_age_gate();

-- ----------------------------------------------------------------------------
-- 2. PERSONA TABLE (Onboarding Persona Wizard & Multi-Persona Switcher)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,       -- {{user}} handle used by bots in roleplay
  backstory TEXT NOT NULL DEFAULT '', -- Character lore, physical traits, personality
  avatar_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personas_user ON public.personas(user_id, is_default DESC);

-- Ensure at most one default persona per user
CREATE UNIQUE INDEX uq_personas_single_default
  ON public.personas(user_id)
  WHERE is_default = TRUE;

-- ----------------------------------------------------------------------------
-- 3. BOT TABLE (Published Profile Showcase, Visibility & NSFW Guard)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE bot_visibility_mode AS ENUM ('PUBLIC', 'PRIVATE', 'DRAFT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.showcase_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  tagline VARCHAR(240) NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility bot_visibility_mode NOT NULL DEFAULT 'PUBLIC',
  is_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
  chat_count BIGINT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for Profile Bot Showcase & Safe Age-Gate Filtering
CREATE INDEX idx_showcase_bots_profile
  ON public.showcase_bots(creator_id, visibility, is_nsfw, like_count DESC);

CREATE INDEX idx_showcase_bots_public_feed
  ON public.showcase_bots(visibility, is_nsfw, chat_count DESC)
  WHERE visibility = 'PUBLIC';

-- ----------------------------------------------------------------------------
-- 4. FRIENDSHIP & BLOCK ISOLATION TABLE
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE social_rel_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status social_rel_status NOT NULL DEFAULT 'PENDING',
  blocked_by_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_relation CHECK (requester_id <> addressee_id)
);

-- Bidirectional uniqueness: prevents conflicting (A,B) and (B,A) records
CREATE UNIQUE INDEX uq_user_friendships_pair
  ON public.user_friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX idx_user_friendships_lookup
  ON public.user_friendships(requester_id, addressee_id, status);
