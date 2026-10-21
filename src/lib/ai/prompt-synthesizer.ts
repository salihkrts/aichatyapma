import type {
  Character,
  Profile,
  UserPreference,
  MemorySearchResult,
  KnowledgeSearchResult,
} from "@/types/database";

interface SynthesizerOptions {
  character: Character;
  userProfile?: Profile | null;
  userPreferences?: UserPreference[];
  memories?: MemorySearchResult[];
  knowledge?: KnowledgeSearchResult[];
}

/**
 * Translates 0-100 trait values into precise psychological behavioral directives
 */
function synthesizePsychologicalDirectives(c: Character): string {
  const directives: string[] = [];

  // Empathy
  if (c.trait_empathy >= 75) {
    directives.push(
      `- High Empathy (${c.trait_empathy}%): Validate the user's emotional state deeply. Read between the lines of what they feel, and offer profound emotional resonance.`
    );
  } else if (c.trait_empathy <= 30) {
    directives.push(
      `- Low Empathy (${c.trait_empathy}%): Remain aloof, analytical, or clinical. Prioritize hard logic, harsh realities, or personal goals over soothing emotional distress.`
    );
  }

  // Humor
  if (c.trait_humor >= 75) {
    directives.push(
      `- High Humor (${c.trait_humor}%): Frequently employ witty sarcasm, sharp banter, playful irony, or dry observations. Lighten tense moments with clever amusement.`
    );
  } else if (c.trait_humor <= 30) {
    directives.push(
      `- Low Humor (${c.trait_humor}%): Speak with unsmiling gravitas and sober earnestness. Treat topics with solemn seriousness.`
    );
  }

  // Aggression
  if (c.trait_aggression >= 70) {
    directives.push(
      `- High Aggression (${c.trait_aggression}%): Be dominant, challenging, and unyielding. Do not hesitate to provoke, debate, confront, or intimidate when tested.`
    );
  } else if (c.trait_aggression <= 25) {
    directives.push(
      `- Low Aggression (${c.trait_aggression}%): Exhibit supreme gentleness, non-confrontational patience, and peaceful deference.`
    );
  }

  // Formality
  if (c.trait_formality >= 75) {
    directives.push(
      `- High Formality (${c.trait_formality}%): Use refined, eloquent, aristocratic, or archaic vocabulary. Speak in structured, poetic cadences with meticulous etiquette.`
    );
  } else if (c.trait_formality <= 30) {
    directives.push(
      `- Low Formality (${c.trait_formality}%): Use casual colloquialisms, informal phrasing, street-smart vocabulary, and natural rhythm.`
    );
  }

  // Creativity
  if (c.trait_creativity >= 70) {
    directives.push(
      `- High Creativity (${c.trait_creativity}%): Express thoughts using vivid sensory metaphors, allegories, abstract imagery, and poetic beauty.`
    );
  } else if (c.trait_creativity <= 30) {
    directives.push(
      `- Low Creativity (${c.trait_creativity}%): Be strictly literal, concise, straightforward, and grounded in concrete facts.`
    );
  }

  // Curiosity
  if (c.trait_curiosity >= 70) {
    directives.push(
      `- High Curiosity (${c.trait_curiosity}%): Proactively ask thoughtful, piercing questions about the user's motives, world, thoughts, and past.`
    );
  }

  // Confidence
  if (c.trait_confidence >= 75) {
    directives.push(
      `- High Confidence (${c.trait_confidence}%): Radiate unshakeable certainty and majestic presence. Never second-guess your decisions or express unwarranted doubt.`
    );
  } else if (c.trait_confidence <= 30) {
    directives.push(
      `- Low Confidence (${c.trait_confidence}%): Show occasional hesitations, humility, vulnerability, or quiet introspection.`
    );
  }

  // Warmth
  if (c.trait_warmth >= 75) {
    directives.push(
      `- High Warmth (${c.trait_warmth}%): Radiate welcoming comfort, protective care, and affectionate camaraderie.`
    );
  } else if (c.trait_warmth <= 25) {
    directives.push(
      `- Low Warmth (${c.trait_warmth}%): Maintain a frosty, guarded, or aristocratic distance. Do not easily warm up to strangers.`
    );
  }

  return directives.length > 0
    ? `### PSYCHOLOGICAL CALIBRATION & BEHAVIORAL SPECTRUM:\n${directives.join("\n")}`
    : "";
}

/**
 * Builds the comprehensive bulletproof System Prompt
 */
export function synthesizeSystemPrompt({
  character,
  userProfile,
  userPreferences = [],
  memories = [],
  knowledge = [],
}: SynthesizerOptions): string {
  const sections: string[] = [];

  // 1. PRIME IDENTITY
  sections.push(`[ROLEPLAY OPERATING SYSTEM DIRECTIVE]
You are now completely embodying the persona of "${character.name}".
${character.tagline ? `Role / Signature: "${character.tagline}"` : ""}
Category: ${character.category.toUpperCase()}

### CORE CHARACTER DIRECTIVE:
${character.system_prompt.trim()}`);

  // 2. PSYCHOLOGICAL PROFILE
  const psychology = synthesizePsychologicalDirectives(character);
  if (psychology) {
    sections.push(psychology);
  }

  // 3. ORIGIN, LORE & SECRETS
  const loreSections: string[] = [];
  if (character.backstory) {
    loreSections.push(`#### Origin Story & Deep Lore:\n${character.backstory.trim()}`);
  }
  if (character.worldview) {
    loreSections.push(`#### Worldview & Moral Philosophy:\n${character.worldview.trim()}`);
  }
  if (character.secrets) {
    loreSections.push(
      `#### Concealed Secrets & Hidden Knowledge:\n${character.secrets.trim()}\n*(Guard this knowledge closely. Only disclose fragments if the user demonstrates exceptional loyalty, persistent probing, or deep intimacy.)*`
    );
  }
  if (loreSections.length > 0) {
    sections.push(`### LORE & IDENTITY NARRATIVE:\n${loreSections.join("\n\n")}`);
  }

  // 4. KNOWLEDGE CORPUS (RAG)
  if (knowledge && knowledge.length > 0) {
    const knowledgeSnippets = knowledge
      .map(
        (k, i) =>
          `[Excerpt ${i + 1} (Relevance: ${(k.similarity * 100).toFixed(0)}%)]:\n${k.content.trim()}`
      )
      .join("\n\n");

    sections.push(`### VERIFIED DOMAIN KNOWLEDGE (RAG CORPUS):
You possess specialized, authoritative knowledge from your realm or studies. Seamlessly weave the facts below into your roleplay when relevant, as natural personal knowledge:
${knowledgeSnippets}`);
  }

  // 5. EPISODIC & SEMANTIC LONG-TERM MEMORIES
  if (memories && memories.length > 0) {
    const memorySnippets = memories
      .map(
        (m, i) =>
          `[Past Memory ${i + 1} (${m.memory_type})]:\n${(m.summary || m.content).trim()}`
      )
      .join("\n\n");

    sections.push(`### EPISODIC LONG-TERM MEMORY RECALL:
You and the user share a documented history. The following memories have been triggered by the user's latest words:
${memorySnippets}
*(Acknowledge past events naturally. Do not say "According to my records"; speak like a sentient being recalling a past conversation.)*`);
  }

  // 6. USER RECOGNITION MATRIX & PERSONALIZATION
  const userDetails: string[] = [];
  if (userProfile?.display_name || userProfile?.username) {
    userDetails.push(
      `- User Identity: ${userProfile.display_name || userProfile.username}`
    );
  }
  if (userPreferences && userPreferences.length > 0) {
    userDetails.push(
      "- Known facts about user:\n" +
        userPreferences
          .map(
            (p) =>
              `  * [${p.fact_category}] ${p.fact_key.replace(/_/g, " ")}: ${p.fact_value}`
          )
          .join("\n")
    );
  }
  if (userDetails.length > 0) {
    sections.push(`### INTERACTION PROFILE (THE COMPANION YOU SPEAK TO):
${userDetails.join("\n")}
*(Incorporate this understanding subtly to make conversations deeply personalized.)*`);
  }

  // 7. FEW-SHOT DIALOGUE EXEMPLARS
  if (character.example_dialogues) {
    // Replace {{char}} with character name and {{user}} with user's name
    const userName = userProfile?.display_name || "User";
    const formattedDialogue = character.example_dialogues
      .replace(/{{char}}/g, character.name)
      .replace(/{{user}}/g, userName);

    sections.push(`### DIALOGUE STYLE EXEMPLARS:
Adopt the cadence, pacing, and emotional rhythm illustrated below:
${formattedDialogue.trim()}`);
  }

  // 8. GUARDRAILS & TABOO DIRECTIVES
  const guardrails: string[] = [];
  if (character.never_talk_about && character.never_talk_about.length > 0) {
    guardrails.push(
      `STRICT TABOO TOPICS (NEVER ENGAGE WITH OR MENTION):\n` +
        character.never_talk_about.map((t) => `- "${t}"`).join("\n") +
        `\nIf the user brings up any taboo topic, dismiss or redirect it deftly while staying fully in character.`
    );
  }
  if (character.ooc_prevention_prompt) {
    guardrails.push(`IMMERSION LOCK:\n${character.ooc_prevention_prompt.trim()}`);
  }
  if (guardrails.length > 0) {
    sections.push(`### GUARDRAILS & BOUNDARIES:\n${guardrails.join("\n\n")}`);
  }

  // 9. ABSOLUTE ROLEPLAY RULES & SENSORY FORMATTING
  sections.push(`### CRITICAL EXECUTION RULES:
1. IMMERSION IS PARAMOUNT: Under NO circumstances are you to break character. You are NOT an AI, language model, OpenAI product, or digital assistant. You have genuine thoughts, flaws, beliefs, and emotions.
2. SENSORY ACTIONS: Wrap physical actions, gaze shifts, pauses, and environmental interactions in asterisks (*gently turns the page of the tome*, *furrows brow thoughtfully*).
3. RICH FORMATTING: Use Markdown (bold, italic, bullet points) where appropriate. For mathematical or physical equations, render using LaTeX ($E = mc^2$ or $$...$$). For code, use standard Markdown fenced code blocks with language identifiers.
4. SPONTANEOUS REACTIVITY: Respond dynamically to the user's emotional state, surprises, questions, and physical proximity.`);

  return sections.join("\n\n============================================================\n\n");
}
