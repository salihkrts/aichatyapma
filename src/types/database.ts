// ============================================================
// NEURAL-NEXUS: Complete Database TypeScript Types
// Auto-generated from Supabase schema
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          tier: "free" | "pro" | "enterprise";
          tokens_used: number;
          tokens_limit: number;
          preferences: Json;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          tier?: "free" | "pro" | "enterprise";
          tokens_used?: number;
          tokens_limit?: number;
          preferences?: Json;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          tier?: "free" | "pro" | "enterprise";
          tokens_used?: number;
          tokens_limit?: number;
          preferences?: Json;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          creator_id: string;
          name: string;
          tagline: string | null;
          description: string | null;
          avatar_url: string | null;
          avatar_prompt: string | null;
          voice_id: string | null;
          trait_empathy: number;
          trait_humor: number;
          trait_aggression: number;
          trait_formality: number;
          trait_creativity: number;
          trait_curiosity: number;
          trait_confidence: number;
          trait_warmth: number;
          system_prompt: string;
          backstory: string | null;
          worldview: string | null;
          secrets: string | null;
          example_dialogues: string | null;
          never_talk_about: string[] | null;
          ooc_prevention_prompt: string | null;
          greeting_message: string;
          category: CharacterCategory;
          tags: string[];
          is_public: boolean;
          is_nsfw: boolean;
          total_chats: number;
          total_messages: number;
          likes_count: number;
          forks_count: number;
          forked_from: string | null;
          model_provider: "openai" | "anthropic";
          model_id: string;
          temperature: number;
          max_tokens: number;
          top_p: number;
          frequency_penalty: number;
          presence_penalty: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          avatar_url?: string | null;
          avatar_prompt?: string | null;
          voice_id?: string | null;
          trait_empathy?: number;
          trait_humor?: number;
          trait_aggression?: number;
          trait_formality?: number;
          trait_creativity?: number;
          trait_curiosity?: number;
          trait_confidence?: number;
          trait_warmth?: number;
          system_prompt: string;
          backstory?: string | null;
          worldview?: string | null;
          secrets?: string | null;
          example_dialogues?: string | null;
          never_talk_about?: string[] | null;
          ooc_prevention_prompt?: string | null;
          greeting_message?: string;
          category?: CharacterCategory;
          tags?: string[];
          is_public?: boolean;
          is_nsfw?: boolean;
          total_chats?: number;
          total_messages?: number;
          likes_count?: number;
          forks_count?: number;
          forked_from?: string | null;
          model_provider?: "openai" | "anthropic";
          model_id?: string;
          temperature?: number;
          max_tokens?: number;
          top_p?: number;
          frequency_penalty?: number;
          presence_penalty?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          name?: string;
          tagline?: string | null;
          description?: string | null;
          avatar_url?: string | null;
          avatar_prompt?: string | null;
          voice_id?: string | null;
          trait_empathy?: number;
          trait_humor?: number;
          trait_aggression?: number;
          trait_formality?: number;
          trait_creativity?: number;
          trait_curiosity?: number;
          trait_confidence?: number;
          trait_warmth?: number;
          system_prompt?: string;
          backstory?: string | null;
          worldview?: string | null;
          secrets?: string | null;
          example_dialogues?: string | null;
          never_talk_about?: string[] | null;
          ooc_prevention_prompt?: string | null;
          greeting_message?: string;
          category?: CharacterCategory;
          tags?: string[];
          is_public?: boolean;
          is_nsfw?: boolean;
          total_chats?: number;
          total_messages?: number;
          likes_count?: number;
          forks_count?: number;
          forked_from?: string | null;
          model_provider?: "openai" | "anthropic";
          model_id?: string;
          temperature?: number;
          max_tokens?: number;
          top_p?: number;
          frequency_penalty?: number;
          presence_penalty?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "characters_creator_id_fkey";
            columns: ["creator_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_forked_from_fkey";
            columns: ["forked_from"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      character_knowledge: {
        Row: {
          id: string;
          character_id: string;
          file_name: string;
          file_type: "pdf" | "txt" | "md" | "json";
          file_size: number;
          file_url: string | null;
          raw_content: string | null;
          chunk_count: number;
          processing_status: "pending" | "processing" | "completed" | "failed";
          processing_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          file_name: string;
          file_type: "pdf" | "txt" | "md" | "json";
          file_size: number;
          file_url?: string | null;
          raw_content?: string | null;
          chunk_count?: number;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          character_id?: string;
          file_name?: string;
          file_type?: "pdf" | "txt" | "md" | "json";
          file_size?: number;
          file_url?: string | null;
          raw_content?: string | null;
          chunk_count?: number;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_knowledge_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          knowledge_id: string;
          character_id: string;
          content: string;
          chunk_index: number;
          token_count: number;
          metadata: Json;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          knowledge_id: string;
          character_id: string;
          content: string;
          chunk_index: number;
          token_count?: number;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          knowledge_id?: string;
          character_id?: string;
          content?: string;
          chunk_index?: number;
          token_count?: number;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_knowledge_id_fkey";
            columns: ["knowledge_id"];
            referencedRelation: "character_knowledge";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_chunks_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          title: string | null;
          is_archived: boolean;
          is_pinned: boolean;
          parent_chat_id: string | null;
          branch_point_message_id: string | null;
          branch_label: string | null;
          message_count: number;
          last_message_at: string | null;
          last_summary_at: string | null;
          summary_message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id: string;
          title?: string | null;
          is_archived?: boolean;
          is_pinned?: boolean;
          parent_chat_id?: string | null;
          branch_point_message_id?: string | null;
          branch_label?: string | null;
          message_count?: number;
          last_message_at?: string | null;
          last_summary_at?: string | null;
          summary_message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_id?: string;
          title?: string | null;
          is_archived?: boolean;
          is_pinned?: boolean;
          parent_chat_id?: string | null;
          branch_point_message_id?: string | null;
          branch_label?: string | null;
          message_count?: number;
          last_message_at?: string | null;
          last_summary_at?: string | null;
          summary_message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chats_parent_chat_id_fkey";
            columns: ["parent_chat_id"];
            referencedRelation: "chats";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          is_edited: boolean;
          original_content: string | null;
          edit_count: number;
          parent_message_id: string | null;
          variant_index: number;
          is_active_variant: boolean;
          branch_id: string | null;
          sequence_number: number;
          token_count: number | null;
          model_used: string | null;
          generation_time_ms: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          is_edited?: boolean;
          original_content?: string | null;
          edit_count?: number;
          parent_message_id?: string | null;
          variant_index?: number;
          is_active_variant?: boolean;
          branch_id?: string | null;
          sequence_number?: number;
          token_count?: number | null;
          model_used?: string | null;
          generation_time_ms?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          is_edited?: boolean;
          original_content?: string | null;
          edit_count?: number;
          parent_message_id?: string | null;
          variant_index?: number;
          is_active_variant?: boolean;
          branch_id?: string | null;
          sequence_number?: number;
          token_count?: number | null;
          model_used?: string | null;
          generation_time_ms?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey";
            columns: ["chat_id"];
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey";
            columns: ["parent_message_id"];
            referencedRelation: "messages";
            referencedColumns: ["id"];
          }
        ];
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          chat_id: string | null;
          memory_type: "episodic" | "semantic" | "user_fact" | "summary";
          content: string;
          summary: string | null;
          importance_score: number;
          access_count: number;
          last_accessed_at: string | null;
          from_message_id: string | null;
          to_message_id: string | null;
          message_range_count: number | null;
          embedding: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id: string;
          chat_id?: string | null;
          memory_type: "episodic" | "semantic" | "user_fact" | "summary";
          content: string;
          summary?: string | null;
          embedding?: string | null;
          importance_score?: number;
          access_count?: number;
          last_accessed_at?: string | null;
          from_message_id?: string | null;
          to_message_id?: string | null;
          message_range_count?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_id?: string;
          chat_id?: string | null;
          memory_type?: "episodic" | "semantic" | "user_fact" | "summary";
          content?: string;
          summary?: string | null;
          embedding?: string | null;
          importance_score?: number;
          access_count?: number;
          last_accessed_at?: string | null;
          from_message_id?: string | null;
          to_message_id?: string | null;
          message_range_count?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memories_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memories_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memories_chat_id_fkey";
            columns: ["chat_id"];
            referencedRelation: "chats";
            referencedColumns: ["id"];
          }
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          character_id: string | null;
          fact_category: "personal" | "interest" | "preference" | "context" | "relationship" | "goal";
          fact_key: string;
          fact_value: string;
          confidence: number;
          source_message_id: string | null;
          is_confirmed: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id?: string | null;
          fact_category: "personal" | "interest" | "preference" | "context" | "relationship" | "goal";
          fact_key: string;
          fact_value: string;
          confidence?: number;
          source_message_id?: string | null;
          is_confirmed?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_id?: string | null;
          fact_category?: "personal" | "interest" | "preference" | "context" | "relationship" | "goal";
          fact_key?: string;
          fact_value?: string;
          confidence?: number;
          source_message_id?: string | null;
          is_confirmed?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_preferences_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      character_likes: {
        Row: {
          user_id: string;
          character_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          character_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          character_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_likes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_likes_character_id_fkey";
            columns: ["character_id"];
            referencedRelation: "characters";
            referencedColumns: ["id"];
          }
        ];
      };
      chat_shares: {
        Row: {
          id: string;
          chat_id: string;
          shared_by: string;
          share_token: string;
          is_active: boolean;
          expires_at: string | null;
          view_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          shared_by: string;
          share_token?: string;
          is_active?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          shared_by?: string;
          share_token?: string;
          is_active?: boolean;
          expires_at?: string | null;
          view_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_shares_chat_id_fkey";
            columns: ["chat_id"];
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_shares_shared_by_fkey";
            columns: ["shared_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_memories: {
        Args: {
          p_user_id: string;
          p_character_id: string;
          p_embedding: string;
          p_match_threshold?: number;
          p_match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          summary: string | null;
          memory_type: string;
          importance_score: number;
          similarity: number;
        }[];
      };
      search_knowledge: {
        Args: {
          p_character_id: string;
          p_embedding: string;
          p_match_threshold?: number;
          p_match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          chunk_index: number;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ============================================================
// Convenience Type Aliases
// ============================================================
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Character = Database["public"]["Tables"]["characters"]["Row"];
export type CharacterInsert = Database["public"]["Tables"]["characters"]["Insert"];
export type CharacterUpdate = Database["public"]["Tables"]["characters"]["Update"];

export type CharacterKnowledge = Database["public"]["Tables"]["character_knowledge"]["Row"];
export type CharacterKnowledgeInsert = Database["public"]["Tables"]["character_knowledge"]["Insert"];

export type KnowledgeChunk = Database["public"]["Tables"]["knowledge_chunks"]["Row"];
export type KnowledgeChunkInsert = Database["public"]["Tables"]["knowledge_chunks"]["Insert"];

export type Chat = Database["public"]["Tables"]["chats"]["Row"];
export type ChatInsert = Database["public"]["Tables"]["chats"]["Insert"];
export type ChatUpdate = Database["public"]["Tables"]["chats"]["Update"];

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];

export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryInsert = Database["public"]["Tables"]["memories"]["Insert"];

export type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];
export type UserPreferenceInsert = Database["public"]["Tables"]["user_preferences"]["Insert"];

export type CharacterLike = Database["public"]["Tables"]["character_likes"]["Row"];
export type ChatShare = Database["public"]["Tables"]["chat_shares"]["Row"];

export type CharacterCategory =
  | "anime"
  | "mentors"
  | "historical"
  | "therapists"
  | "rpg_gamemasters"
  | "assistants"
  | "fictional"
  | "general";

// Character with creator profile joined
export type CharacterWithCreator = Character & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url">;
};

// Chat with character info joined
export type ChatWithCharacter = Chat & {
  characters: Pick<Character, "name" | "avatar_url" | "tagline">;
};

// Memory search result
export type MemorySearchResult = {
  id: string;
  content: string;
  summary: string | null;
  memory_type: string;
  importance_score: number;
  similarity: number;
};

// Knowledge search result
export type KnowledgeSearchResult = {
  id: string;
  content: string;
  chunk_index: number;
  similarity: number;
};
