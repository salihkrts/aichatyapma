import { z } from "zod";

export const characterCategories = [
  "anime",
  "mentors",
  "historical",
  "therapists",
  "rpg_gamemasters",
  "assistants",
  "fictional",
  "general",
] as const;

export const characterSchema = z.object({
  // Core Demographics
  name: z
    .string()
    .min(2, "Character name must be at least 2 characters")
    .max(50, "Character name cannot exceed 50 characters"),
  tagline: z.string().max(120, "Tagline cannot exceed 120 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters"),
  avatar_url: z.string(),
  avatar_prompt: z.string(),
  voice_id: z.string(),
  category: z.enum(characterCategories),
  tags: z.array(z.string()),

  // Psychological Traits (0-100)
  trait_empathy: z.number().int().min(0).max(100),
  trait_humor: z.number().int().min(0).max(100),
  trait_aggression: z.number().int().min(0).max(100),
  trait_formality: z.number().int().min(0).max(100),
  trait_creativity: z.number().int().min(0).max(100),
  trait_curiosity: z.number().int().min(0).max(100),
  trait_confidence: z.number().int().min(0).max(100),
  trait_warmth: z.number().int().min(0).max(100),

  // Deep Lore & Backstory
  system_prompt: z
    .string()
    .min(10, "System prompt must be at least 10 characters")
    .max(8000, "System prompt cannot exceed 8000 characters"),
  backstory: z.string(),
  worldview: z.string(),
  secrets: z.string(),
  example_dialogues: z.string(),

  // Guardrails & OOC
  never_talk_about: z.array(z.string()),
  ooc_prevention_prompt: z.string(),

  // Greeting Message
  greeting_message: z
    .string()
    .min(1, "Greeting message is required")
    .max(2000, "Greeting message cannot exceed 2000 characters"),

  // Visibility & Content
  is_public: z.boolean(),
  is_nsfw: z.boolean(),

  // AI Model Configuration
  model_provider: z.enum(["openai", "anthropic"]),
  model_id: z.string(),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(100).max(8192),
  top_p: z.number().min(0).max(1),
  frequency_penalty: z.number().min(-2).max(2),
  presence_penalty: z.number().min(-2).max(2),
});

export type CharacterFormData = z.infer<typeof characterSchema>;

export const defaultCharacterValues: CharacterFormData = {
  name: "",
  tagline: "",
  description: "",
  avatar_url: "",
  avatar_prompt: "",
  voice_id: "21m00Tcm4TlvDq8ikWAM", // ElevenLabs Rachel default voice
  category: "general",
  tags: [],
  trait_empathy: 50,
  trait_humor: 50,
  trait_aggression: 20,
  trait_formality: 50,
  trait_creativity: 60,
  trait_curiosity: 70,
  trait_confidence: 65,
  trait_warmth: 55,
  system_prompt:
    "You are an enigmatic and deeply knowledgeable mentor. Speak with elegance, quiet confidence, and subtle wit. Always stay in character.",
  backstory: "",
  worldview: "",
  secrets: "",
  example_dialogues: `<START>\n{{user}}: Who are you?\n{{char}}: *smiles gently, adjusting his glasses* I am merely a student of the unseen horizons. And you, my friend, have just stepped into a much larger world.`,
  never_talk_about: ["modern real-world politics", "breaking fourth wall"],
  ooc_prevention_prompt:
    "Never break character. Never acknowledge that you are an AI or language model under any circumstances. Stay true to your personality and lore at all costs.",
  greeting_message:
    "Greetings. I have been expecting someone with your curiosity. Tell me, what truth do you seek today?",
  is_public: true,
  is_nsfw: false,
  model_provider: "openai",
  model_id: "gpt-4o",
  temperature: 0.85,
  max_tokens: 2048,
  top_p: 0.95,
  frequency_penalty: 0,
  presence_penalty: 0,
};
