-- ============================================================
-- NEURAL-NEXUS: Complete Database Schema
-- Supabase PostgreSQL + pgvector
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_limit INTEGER NOT NULL DEFAULT 10000,
  preferences JSONB NOT NULL DEFAULT '{"theme": "dark", "language": "en", "notifications": true}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX idx_profiles_tier ON public.profiles USING btree (tier);

-- ============================================================
-- 2. CHARACTERS TABLE (The Character Forge)
-- ============================================================
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core Demographics
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  avatar_prompt TEXT, -- For AI avatar generation
  voice_id TEXT, -- ElevenLabs voice ID
  
  -- Psychological Profile (0-100 sliders)
  trait_empathy INTEGER NOT NULL DEFAULT 50 CHECK (trait_empathy BETWEEN 0 AND 100),
  trait_humor INTEGER NOT NULL DEFAULT 50 CHECK (trait_humor BETWEEN 0 AND 100),
  trait_aggression INTEGER NOT NULL DEFAULT 20 CHECK (trait_aggression BETWEEN 0 AND 100),
  trait_formality INTEGER NOT NULL DEFAULT 50 CHECK (trait_formality BETWEEN 0 AND 100),
  trait_creativity INTEGER NOT NULL DEFAULT 50 CHECK (trait_creativity BETWEEN 0 AND 100),
  trait_curiosity INTEGER NOT NULL DEFAULT 50 CHECK (trait_curiosity BETWEEN 0 AND 100),
  trait_confidence INTEGER NOT NULL DEFAULT 50 CHECK (trait_confidence BETWEEN 0 AND 100),
  trait_warmth INTEGER NOT NULL DEFAULT 50 CHECK (trait_warmth BETWEEN 0 AND 100),
  
  -- Deep Lore
  system_prompt TEXT NOT NULL,
  backstory TEXT,
  worldview TEXT,
  secrets TEXT, -- Hidden knowledge the character has
  example_dialogues TEXT, -- Few-shot examples
  
  -- Guardrails
  never_talk_about TEXT[], -- Array of forbidden topics
  ooc_prevention_prompt TEXT, -- Anti-OOC instructions
  
  -- Greeting & First Message
  greeting_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('anime', 'mentors', 'historical', 'therapists', 'rpg_gamemasters', 'assistants', 'fictional', 'general')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  
  -- Visibility & Stats
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_nsfw BOOLEAN NOT NULL DEFAULT false,
  total_chats INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  forks_count INTEGER NOT NULL DEFAULT 0,
  forked_from UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  
  -- AI Model Config
  model_provider TEXT NOT NULL DEFAULT 'openai' CHECK (model_provider IN ('openai', 'anthropic')),
  model_id TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature NUMERIC(3,2) NOT NULL DEFAULT 0.85 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INTEGER NOT NULL DEFAULT 2048 CHECK (max_tokens BETWEEN 100 AND 8192),
  top_p NUMERIC(3,2) NOT NULL DEFAULT 0.95 CHECK (top_p BETWEEN 0 AND 1),
  frequency_penalty NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (frequency_penalty BETWEEN -2 AND 2),
  presence_penalty NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (presence_penalty BETWEEN -2 AND 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_characters_creator ON public.characters USING btree (creator_id);
CREATE INDEX idx_characters_category ON public.characters USING btree (category);
CREATE INDEX idx_characters_public ON public.characters USING btree (is_public) WHERE is_public = true;
CREATE INDEX idx_characters_likes ON public.characters USING btree (likes_count DESC);
CREATE INDEX idx_characters_tags ON public.characters USING gin (tags);
CREATE INDEX idx_characters_name_trgm ON public.characters USING gin (name gin_trgm_ops);

-- ============================================================
-- 3. CHARACTER KNOWLEDGE BASE (RAG Documents)
-- ============================================================
CREATE TABLE public.character_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  
  -- Document Info
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt', 'md', 'json')),
  file_size INTEGER NOT NULL, -- bytes
  file_url TEXT, -- Supabase Storage URL
  
  -- Processed Content
  raw_content TEXT, -- Extracted text
  chunk_count INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_character ON public.character_knowledge USING btree (character_id);
CREATE INDEX idx_knowledge_status ON public.character_knowledge USING btree (processing_status);

-- ============================================================
-- 4. KNOWLEDGE CHUNKS (Embedded vectors for RAG)
-- ============================================================
CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id UUID NOT NULL REFERENCES public.character_knowledge(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536), -- OpenAI ada-002 dimension
  
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_knowledge ON public.knowledge_chunks USING btree (knowledge_id);
CREATE INDEX idx_chunks_character ON public.knowledge_chunks USING btree (character_id);
CREATE INDEX idx_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 5. CHATS TABLE
-- ============================================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  
  title TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  
  -- Timeline branching
  parent_chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  branch_point_message_id UUID, -- Message where this branch diverged
  branch_label TEXT,
  
  -- Stats
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Memory tracking
  last_summary_at TIMESTAMPTZ,
  summary_message_count INTEGER NOT NULL DEFAULT 0, -- Messages since last summary
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chats_user ON public.chats USING btree (user_id);
CREATE INDEX idx_chats_character ON public.chats USING btree (character_id);
CREATE INDEX idx_chats_user_character ON public.chats USING btree (user_id, character_id);
CREATE INDEX idx_chats_parent ON public.chats USING btree (parent_chat_id);
CREATE INDEX idx_chats_last_message ON public.chats USING btree (last_message_at DESC);

-- ============================================================
-- 6. MESSAGES TABLE
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Edit & Regeneration tracking
  is_edited BOOLEAN NOT NULL DEFAULT false,
  original_content TEXT, -- Keep original before edit
  edit_count INTEGER NOT NULL DEFAULT 0,
  
  -- Regeneration variants
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  variant_index INTEGER NOT NULL DEFAULT 0, -- 0 = original, 1+ = regenerations
  is_active_variant BOOLEAN NOT NULL DEFAULT true, -- Which variant is currently displayed
  
  -- Branch tracking
  branch_id UUID, -- Groups messages in the same timeline branch
  sequence_number INTEGER NOT NULL DEFAULT 0, -- Order within the branch
  
  -- Metadata
  token_count INTEGER,
  model_used TEXT,
  generation_time_ms INTEGER, -- How long AI took to respond
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Extra data (tool calls, etc.)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat ON public.messages USING btree (chat_id);
CREATE INDEX idx_messages_chat_sequence ON public.messages USING btree (chat_id, sequence_number);
CREATE INDEX idx_messages_parent ON public.messages USING btree (parent_message_id);
CREATE INDEX idx_messages_branch ON public.messages USING btree (branch_id);
CREATE INDEX idx_messages_created ON public.messages USING btree (created_at);

-- ============================================================
-- 7. MEMORIES TABLE (Long-Term Episodic Memory with Vectors)
-- ============================================================
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  
  -- Memory content
  memory_type TEXT NOT NULL CHECK (memory_type IN ('episodic', 'semantic', 'user_fact', 'summary')),
  content TEXT NOT NULL,
  summary TEXT, -- Compressed version
  
  -- Vector embedding for similarity search
  embedding vector(1536),
  
  -- Context
  importance_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (importance_score BETWEEN 0 AND 1),
  access_count INTEGER NOT NULL DEFAULT 0, -- How many times this memory was retrieved
  last_accessed_at TIMESTAMPTZ,
  
  -- Message range this memory covers
  from_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  message_range_count INTEGER, -- Number of messages summarized
  
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_user_character ON public.memories USING btree (user_id, character_id);
CREATE INDEX idx_memories_chat ON public.memories USING btree (chat_id);
CREATE INDEX idx_memories_type ON public.memories USING btree (memory_type);
CREATE INDEX idx_memories_importance ON public.memories USING btree (importance_score DESC);
CREATE INDEX idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 8. USER PREFERENCES / PROFILE FACTS
-- (AI-extracted knowledge about the user)
-- ============================================================
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE, -- NULL = global fact
  
  fact_category TEXT NOT NULL CHECK (fact_category IN ('personal', 'interest', 'preference', 'context', 'relationship', 'goal')),
  fact_key TEXT NOT NULL, -- e.g., 'occupation', 'favorite_genre'
  fact_value TEXT NOT NULL, -- e.g., 'software engineer', 'sci-fi'
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  
  source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false, -- User explicitly confirmed
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, character_id, fact_key)
);

CREATE INDEX idx_user_prefs_user ON public.user_preferences USING btree (user_id);
CREATE INDEX idx_user_prefs_user_character ON public.user_preferences USING btree (user_id, character_id);
CREATE INDEX idx_user_prefs_category ON public.user_preferences USING btree (fact_category);

-- ============================================================
-- 9. CHARACTER LIKES (Social)
-- ============================================================
CREATE TABLE public.character_likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, character_id)
);

CREATE INDEX idx_likes_character ON public.character_likes USING btree (character_id);

-- ============================================================
-- 10. CHAT SHARES (Optional: Share chat transcripts)
-- ============================================================
CREATE TABLE public.chat_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shares_token ON public.chat_shares USING btree (share_token);
CREATE INDEX idx_shares_chat ON public.chat_shares USING btree (chat_id);

-- ============================================================
-- FUNCTIONS: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.character_knowledge FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.memories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTION: Increment chat message count & update last_message_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats
  SET 
    message_count = message_count + 1,
    summary_message_count = summary_message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.chat_id;
  
  -- Also update character stats
  UPDATE public.characters
  SET total_messages = total_messages + 1,
      updated_at = now()
  WHERE id = (SELECT character_id FROM public.chats WHERE id = NEW.chat_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ============================================================
-- FUNCTION: Handle character likes count
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_character_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.characters SET likes_count = likes_count + 1 WHERE id = NEW.character_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.characters SET likes_count = likes_count - 1 WHERE id = OLD.character_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.character_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_character_like();

-- ============================================================
-- FUNCTION: Create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Vector similarity search for memories
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_memories(
  p_user_id UUID,
  p_character_id UUID,
  p_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  memory_type TEXT,
  importance_score NUMERIC,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.summary,
    m.memory_type,
    m.importance_score,
    1 - (m.embedding <=> p_embedding) AS similarity
  FROM public.memories m
  WHERE m.user_id = p_user_id
    AND m.character_id = p_character_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> p_embedding) > p_match_threshold
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Vector similarity search for knowledge chunks
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_knowledge(
  p_character_id UUID,
  p_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.chunk_index,
    1 - (kc.embedding <=> p_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.character_id = p_character_id
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> p_embedding) > p_match_threshold
  ORDER BY kc.embedding <=> p_embedding
  LIMIT p_match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_shares ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view any profile" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CHARACTERS
CREATE POLICY "Anyone can view public characters" ON public.characters FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY "Users can create characters" ON public.characters FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Users can update own characters" ON public.characters FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Users can delete own characters" ON public.characters FOR DELETE USING (creator_id = auth.uid());

-- CHARACTER KNOWLEDGE
CREATE POLICY "Users can view own character knowledge" ON public.character_knowledge FOR SELECT USING (
  character_id IN (SELECT id FROM public.characters WHERE creator_id = auth.uid())
);
CREATE POLICY "Users can insert own character knowledge" ON public.character_knowledge FOR INSERT WITH CHECK (
  character_id IN (SELECT id FROM public.characters WHERE creator_id = auth.uid())
);
CREATE POLICY "Users can delete own character knowledge" ON public.character_knowledge FOR DELETE USING (
  character_id IN (SELECT id FROM public.characters WHERE creator_id = auth.uid())
);

-- KNOWLEDGE CHUNKS
CREATE POLICY "Users can view own knowledge chunks" ON public.knowledge_chunks FOR SELECT USING (
  character_id IN (SELECT id FROM public.characters WHERE creator_id = auth.uid())
);
CREATE POLICY "Service role can manage knowledge chunks" ON public.knowledge_chunks FOR ALL USING (true);

-- CHATS
CREATE POLICY "Users can view own chats" ON public.chats FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create chats" ON public.chats FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own chats" ON public.chats FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own chats" ON public.chats FOR DELETE USING (user_id = auth.uid());

-- MESSAGES
CREATE POLICY "Users can view own chat messages" ON public.messages FOR SELECT USING (
  chat_id IN (SELECT id FROM public.chats WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert messages to own chats" ON public.messages FOR INSERT WITH CHECK (
  chat_id IN (SELECT id FROM public.chats WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own chat messages" ON public.messages FOR UPDATE USING (
  chat_id IN (SELECT id FROM public.chats WHERE user_id = auth.uid())
);

-- MEMORIES
CREATE POLICY "Users can view own memories" ON public.memories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role can manage memories" ON public.memories FOR ALL USING (true);

-- USER PREFERENCES
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (user_id = auth.uid());

-- CHARACTER LIKES
CREATE POLICY "Users can view likes" ON public.character_likes FOR SELECT USING (true);
CREATE POLICY "Users can like characters" ON public.character_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike characters" ON public.character_likes FOR DELETE USING (user_id = auth.uid());

-- CHAT SHARES
CREATE POLICY "Anyone can view active shares by token" ON public.chat_shares FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create shares for own chats" ON public.chat_shares FOR INSERT WITH CHECK (
  chat_id IN (SELECT id FROM public.chats WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own shares" ON public.chat_shares FOR UPDATE USING (shared_by = auth.uid());
CREATE POLICY "Users can delete own shares" ON public.chat_shares FOR DELETE USING (shared_by = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-files', 'knowledge-files', false);

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access own knowledge files" ON storage.objects FOR SELECT USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload knowledge files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own knowledge files" ON storage.objects FOR DELETE USING (bucket_id = 'knowledge-files' AND auth.uid()::text = (storage.foldername(name))[1]);
