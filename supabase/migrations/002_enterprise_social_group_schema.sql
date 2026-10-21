-- ============================================================================
-- KAEL-AI ENTERPRISE SOCIAL CHAT & MULTI-BOT ORCHESTRATION SCHEMA (v2.0)
-- PostgreSQL 16 + pgvector + Bidirectional Friendship & Credit Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. USERS & PROFILE ARCHITECTURE (Argon2id Auth + Privacy + Bot Showcase)
-- ----------------------------------------------------------------------------
CREATE TYPE user_privacy_level AS ENUM ('PUBLIC', 'FRIENDS_ONLY');
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

CREATE TABLE IF NOT EXISTS public.enterprise_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  password_hash TEXT NOT NULL, -- Argon2id salted hash
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  cover_url TEXT,
  locale VARCHAR(16) NOT NULL DEFAULT 'tr-TR',
  region VARCHAR(64) NOT NULL DEFAULT 'TR',
  privacy_level user_privacy_level NOT NULL DEFAULT 'PUBLIC',
  tier subscription_tier NOT NULL DEFAULT 'FREE',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enterprise_users_username_trgm ON public.enterprise_users USING gin (username gin_trgm_ops);
CREATE INDEX idx_enterprise_users_name_trgm ON public.enterprise_users USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 2. SOCIAL GRAPH & BIDIRECTIONAL FRIENDSHIP ENGINE
-- ----------------------------------------------------------------------------
CREATE TYPE friendship_status AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED', 'REJECTED');

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'PENDING',
  blocked_by_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_friendship CHECK (requester_id <> addressee_id)
);

-- Bidirectional uniqueness: prevents (A, B) and (B, A) duplicate/conflicting rows!
CREATE UNIQUE INDEX uq_friendships_pair
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);

-- ----------------------------------------------------------------------------
-- 3. AI BOTS, PERSONA ARCHETYPES & MARKETPLACE / FORK ENGINE
-- ----------------------------------------------------------------------------
CREATE TYPE bot_visibility AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TYPE bot_archetype AS ENUM ('REALISTIC', 'ANIME', 'FURRY', 'FURSONA', 'ROBOTIC', 'PERSONA', '3D_AVATAR');

CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  avatar_url TEXT,
  archetype bot_archetype NOT NULL DEFAULT 'REALISTIC',
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  role_summary VARCHAR(280) NOT NULL,
  system_prompt TEXT NOT NULL,
  backstory TEXT,
  speaking_style TEXT,
  expertise_keywords TEXT[] NOT NULL DEFAULT '{}', -- Used for Ambient Chat trigger matching
  model_provider VARCHAR(32) NOT NULL DEFAULT 'openai', -- openai, anthropic, google, meta, groq
  model_name VARCHAR(64) NOT NULL DEFAULT 'gpt-4o',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.85 CHECK (temperature BETWEEN 0.0 AND 2.0),
  top_p NUMERIC(3,2) NOT NULL DEFAULT 0.95 CHECK (top_p BETWEEN 0.0 AND 1.0),
  voice_id VARCHAR(120), -- ElevenLabs / OpenAI TTS Voice Profile
  visibility bot_visibility NOT NULL DEFAULT 'PUBLIC',
  is_showcased_on_profile BOOLEAN NOT NULL DEFAULT TRUE,
  original_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  original_creator_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  interactions_count BIGINT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  forks_count INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bots_owner_showcase ON public.bots(owner_id, visibility, is_showcased_on_profile);
CREATE INDEX idx_bots_marketplace ON public.bots(visibility, category, interactions_count DESC, likes_count DESC);
CREATE INDEX idx_bots_keywords_gin ON public.bots USING gin(expertise_keywords);

CREATE TABLE IF NOT EXISTS public.bot_forks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  forked_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  forked_by_user_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  attribution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_bot_id, forked_bot_id)
);

-- ----------------------------------------------------------------------------
-- 4. MULTI-BOT GROUP CHAT ROOMS (CHAT CORE)
-- ----------------------------------------------------------------------------
CREATE TYPE room_role AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  avatar_url TEXT,
  description TEXT,
  rules TEXT,
  is_direct_message BOOLEAN NOT NULL DEFAULT FALSE,
  ambient_bot_chat_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_bot_to_bot_depth SMALLINT NOT NULL DEFAULT 2 CHECK (max_bot_to_bot_depth BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  invited_by_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  role room_role NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_room_members_room ON public.room_members(room_id, role);
CREATE INDEX idx_room_members_user ON public.room_members(user_id);

CREATE TABLE IF NOT EXISTS public.room_bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  ambient_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  custom_room_instructions TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, bot_id)
);

CREATE INDEX idx_room_bots_room ON public.room_bots(room_id);

-- ----------------------------------------------------------------------------
-- 5. GROUP MESSAGES & MULTIMEDIA / TOOL CALL LOGS
-- ----------------------------------------------------------------------------
CREATE TYPE sender_kind AS ENUM ('HUMAN', 'BOT', 'SYSTEM');

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_type sender_kind NOT NULL,
  sender_user_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  sender_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  reply_to_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  -- Multimedia & Voice / Vision fields
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{type: 'image'|'audio', url, transcript, vision_analysis}]
  tts_audio_url TEXT,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb, -- Web search citations, generated FLUX/DALL-E images
  -- Anti-looping & regeneration tracking
  bot_turn_depth SMALLINT NOT NULL DEFAULT 0, -- 0 = human message, 1 = first bot reply, 2 = bot-to-bot reply
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  regeneration_of_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  credits_charged NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_messages_room_time ON public.room_messages(room_id, created_at DESC) WHERE is_deleted = FALSE;

-- ----------------------------------------------------------------------------
-- 6. LONG-TERM VECTOR MEMORY & RAG (pgvector)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memory_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  subject_user_id UUID REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  memory_type VARCHAR(32) NOT NULL DEFAULT 'EPISODIC', -- EPISODIC, USER_PREFERENCE, FACT, SUMMARY
  fact_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL, -- text-embedding-3-small (1536 dims)
  importance_score NUMERIC(3,2) NOT NULL DEFAULT 0.75,
  last_recalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memory_vectors_hnsw
  ON public.memory_vectors USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_memory_vectors_lookup
  ON public.memory_vectors(room_id, bot_id);

-- Semantic Top-K Recall RPC Function
CREATE OR REPLACE FUNCTION public.match_room_memories(
  p_room_id UUID,
  p_bot_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.68,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  fact_text TEXT,
  memory_type VARCHAR(32),
  importance_score NUMERIC,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.id,
    mv.fact_text,
    mv.memory_type,
    mv.importance_score,
    1 - (mv.embedding <=> p_query_embedding) AS similarity
  FROM public.memory_vectors mv
  WHERE (mv.room_id = p_room_id OR mv.bot_id = p_bot_id)
    AND 1 - (mv.embedding <=> p_query_embedding) >= p_match_threshold
  ORDER BY (1 - (mv.embedding <=> p_query_embedding)) * mv.importance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 7. CREDIT, TOKEN QUOTA & CREATOR ECONOMY LEDGER
-- ----------------------------------------------------------------------------
CREATE TYPE credit_tx_type AS ENUM (
  'DAILY_GRANT',
  'SUBSCRIPTION_TOPUP',
  'CHAT_DEDUCTION',
  'IMAGE_GEN_DEDUCTION',
  'VOICE_TTS_DEDUCTION',
  'WEB_SEARCH_DEDUCTION',
  'CREATOR_ROYALTY_REWARD'
);

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  daily_free_credits NUMERIC(12,4) NOT NULL DEFAULT 50.0000,
  purchased_credits NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  creator_earned_credits NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 day'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  related_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  related_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  tx_type credit_tx_type NOT NULL,
  amount NUMERIC(12,4) NOT NULL, -- Negative for deductions, positive for grants/royalties
  balance_after NUMERIC(12,4) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user_time ON public.credit_transactions(user_id, created_at DESC);
