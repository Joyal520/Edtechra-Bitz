// ============================================================================
// EDTECHRA-BITZ: CEFR English Level Configuration
// Centralized definitions for Common European Framework of Reference levels
// ============================================================================

export interface CefrLevelConfig {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  promptInstructions: string;
}

export const CEFR_LEVELS: CefrLevelConfig[] = [
  {
    id: 'A1',
    label: 'A1 — Beginner',
    shortLabel: 'A1',
    description: 'Can understand and use familiar everyday expressions and very basic phrases.',
    promptInstructions:
      'Use ONLY the simplest vocabulary (under 500 common English words). Write very short sentences (5-8 words). Avoid all complex grammar — no conditionals, no passive voice, no relative clauses. Use present tense primarily. Explain concepts as if to a young child. Every sentence must be immediately understandable by someone who has studied English for less than 6 months.'
  },
  {
    id: 'A2',
    label: 'A2 — Elementary',
    shortLabel: 'A2',
    description: 'Can understand sentences and frequently used expressions related to basic topics.',
    promptInstructions:
      'Use simple vocabulary (under 1,500 common English words). Write short, clear sentences (8-12 words). Use basic grammar — simple present, past, and future tenses. Avoid idioms, phrasal verbs, and abstract language. Explain one idea per sentence. Use common connecting words (and, but, because, so). Keep explanations concrete and literal.'
  },
  {
    id: 'B1',
    label: 'B1 — Intermediate',
    shortLabel: 'B1',
    description: 'Can deal with most situations likely to arise while travelling or discussing familiar topics.',
    promptInstructions:
      'Use moderate vocabulary suitable for intermediate English learners. Write clear, natural sentences of moderate length. You may use common phrasal verbs, simple idioms, and passive voice where natural. Include some topic-specific vocabulary but explain any technical terms. Use a variety of tenses including present perfect and conditionals. Keep the tone educational and engaging.'
  },
  {
    id: 'B2',
    label: 'B2 — Upper Intermediate',
    shortLabel: 'B2',
    description: 'Can interact with a degree of fluency and spontaneity with native speakers.',
    promptInstructions:
      'Use natural, moderately advanced vocabulary. Write fluent, well-structured sentences. You may use idiomatic expressions, phrasal verbs, and varied grammatical structures including relative clauses, reported speech, and mixed conditionals. Include subject-specific terminology with brief context where needed. The writing should feel natural and engaging, similar to a quality educational blog post.'
  },
  {
    id: 'C1',
    label: 'C1 — Advanced',
    shortLabel: 'C1',
    description: 'Can express ideas fluently and spontaneously with effective and flexible language use.',
    promptInstructions:
      'Use advanced, precise vocabulary including academic and specialized terms. Write sophisticated, well-crafted sentences with complex structures. Employ nuanced language, subtle connectors, and varied rhetorical devices. Include domain-specific terminology naturally. The writing should demonstrate mastery of English with elegant phrasing and intellectual depth appropriate for an advanced learner.'
  },
  {
    id: 'C2',
    label: 'C2 — Proficient',
    shortLabel: 'C2',
    description: 'Can understand virtually everything heard or read with ease.',
    promptInstructions:
      'Use the full range of English vocabulary including rare, literary, and highly specialized terms. Write with native-level sophistication, employing complex syntax, rhetorical flourishes, and precise academic language. The writing should be indistinguishable from that of an educated native speaker writing for an intellectually curious audience. Use nuance, irony, and wit where appropriate.'
  }
];

export const CEFR_LEVEL_MAP: Record<string, CefrLevelConfig> = Object.fromEntries(
  CEFR_LEVELS.map((level) => [level.id, level])
);

export const getCefrLevelById = (id: string): CefrLevelConfig => {
  return CEFR_LEVEL_MAP[id] || CEFR_LEVELS[2]; // Default to B1
};
