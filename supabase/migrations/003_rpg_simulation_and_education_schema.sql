-- ============================================================================
-- KAEL-AI LAYER 2 & 3: DEEP RPG SIMULATION, BRANCHING TIMELINES,
-- BOT-TO-BOT MATRIX, CHARACTER CARD V2 & AI MATH/EXAM EDUCATION ENGINE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DYNAMIC EMOTION SPRITES (EXPRESSION AVATARS)
-- ----------------------------------------------------------------------------
CREATE TYPE emotion_key AS ENUM (
  'neutral',
  'happy',
  'angry',
  'sad',
  'blushing',
  'shocked',
  'smug',
  'thinking'
);

CREATE TABLE IF NOT EXISTS public.bot_sprites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  emotion emotion_key NOT NULL,
  sprite_url TEXT NOT NULL,
  animation_style VARCHAR(32) NOT NULL DEFAULT 'fade', -- fade, bounce, shake, pulse, glow
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bot_id, emotion)
);

CREATE INDEX idx_bot_sprites_bot ON public.bot_sprites(bot_id);

-- ----------------------------------------------------------------------------
-- 2. AFFECTION / RELATIONSHIP METER (0 - 100)
-- ----------------------------------------------------------------------------
CREATE TYPE affection_stage AS ENUM (
  'ENEMY',        -- 0 - 19  (Düşman)
  'STRANGER',     -- 20 - 39 (Yabancı)
  'FRIEND',       -- 40 - 69 (Arkadaş)
  'CLOSE_ALLY',   -- 70 - 89 (Yakın Dost / Sadık)
  'SOULMATE'      -- 90 - 100 (Âşık / Tutkulu)
);

CREATE TABLE IF NOT EXISTS public.bot_user_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  affection_score SMALLINT NOT NULL DEFAULT 35 CHECK (affection_score BETWEEN 0 AND 100),
  stage affection_stage GENERATED ALWAYS AS (
    CASE
      WHEN affection_score <= 19 THEN 'ENEMY'::affection_stage
      WHEN affection_score <= 39 THEN 'STRANGER'::affection_stage
      WHEN affection_score <= 69 THEN 'FRIEND'::affection_stage
      WHEN affection_score <= 89 THEN 'CLOSE_ALLY'::affection_stage
      ELSE 'SOULMATE'::affection_stage
    END
  ) STORED,
  last_delta SMALLINT NOT NULL DEFAULT 0,
  custom_memory_notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bot_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 3. BOT-TO-BOT RELATIONSHIP MATRIX (MULTI-BOT GROUP DYNAMICS)
-- ----------------------------------------------------------------------------
CREATE TYPE bot_to_bot_stance AS ENUM (
  'ALLY',         -- Dost / Müttefik
  'RIVAL',        -- Rakip / Tatlı Rekabet
  'ROMANTIC',     -- Âşık / Gizli Hayran
  'HOSTILE',      -- Düşman / Zıt Kutup
  'MENTOR_PUPIL'  -- Usta - Çırak
);

CREATE TABLE IF NOT EXISTS public.bot_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  target_bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  stance bot_to_bot_stance NOT NULL DEFAULT 'ALLY',
  trust_level SMALLINT NOT NULL DEFAULT 50 CHECK (trust_level BETWEEN 0 AND 100),
  dynamic_prompt_rule TEXT NOT NULL, -- e.g. "Komiser Boz ile sürekli eski davalar üzerinden tatlı-sert atışırsın."
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_diff_bots CHECK (source_bot_id <> target_bot_id),
  UNIQUE(source_bot_id, target_bot_id)
);

-- ----------------------------------------------------------------------------
-- 4. ROOM THEME, AMBIENT AUDIO & AUTHOR'S NOTE (DIRECTOR MODE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_themes (
  room_id UUID PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  preset_key VARCHAR(64) NOT NULL DEFAULT 'cyberpunk_rain',
  background_url TEXT,
  ambient_audio_url TEXT,
  ambient_volume NUMERIC(3,2) NOT NULL DEFAULT 0.35 CHECK (ambient_volume BETWEEN 0.0 AND 1.0),
  is_audio_playing BOOLEAN NOT NULL DEFAULT FALSE,
  -- Author's Note / Director Mode configuration
  authors_note TEXT DEFAULT '',
  authors_note_depth SMALLINT NOT NULL DEFAULT 2 CHECK (authors_note_depth BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. BRANCHING TIMELINE TREE & CHOICE OPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  parent_branch_id UUID REFERENCES public.chat_branches(id) ON DELETE SET NULL,
  forked_from_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  title VARCHAR(120) NOT NULL DEFAULT 'Ana Zaman Çizelgesi',
  created_by_user_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.room_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.chat_branches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS detected_emotion emotion_key NOT NULL DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS affection_delta SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_room_messages_branch_tree
  ON public.room_messages(room_id, branch_id, parent_message_id, created_at);

CREATE TABLE IF NOT EXISTS public.choice_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  option_index SMALLINT NOT NULL CHECK (option_index BETWEEN 1 AND 5),
  label TEXT NOT NULL,
  action_payload TEXT NOT NULL,
  was_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. RPG STATUS HUD & INVENTORY STATE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rpg_character_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('HUMAN', 'BOT')),
  user_id UUID REFERENCES public.enterprise_users(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  hp INT NOT NULL DEFAULT 100 CHECK (hp BETWEEN 0 AND 9999),
  max_hp INT NOT NULL DEFAULT 100,
  energy INT NOT NULL DEFAULT 100,
  gold INT NOT NULL DEFAULT 250,
  location_name VARCHAR(120) NOT NULL DEFAULT 'Neo-İstanbul Merkez',
  status_effects TEXT[] NOT NULL DEFAULT '{}',
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name: "Gümüş Rozet", qty: 1, rarity: "epic"}]
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. AI MATH & EDUCATION MODULE: GENERATED EXAM PDF DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  creator_user_id UUID REFERENCES public.enterprise_users(id) ON DELETE SET NULL,
  tutor_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  subject VARCHAR(80) NOT NULL DEFAULT 'Matematik',
  difficulty VARCHAR(32) NOT NULL DEFAULT 'Orta-İleri (AYT)',
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
