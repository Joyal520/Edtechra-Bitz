// ============================================================================
// EDTECHRA-BITZ: AI Prompt Generator for External AI Content Creation
// V2: 10 main categories, subtopics auto-assigned by AI, 5 quizzes, 100 words
// ============================================================================

import { getCategoryById } from './bitzTopicsConfig.ts';
import { getCefrLevelById } from './bitzCefrConfig.ts';

export interface AiPromptConfig {
  categoryId: string;      // One of the 10 main category IDs
  cefrLevel: string;       // A1-C2
  quantity: number;         // Number of facts to generate
}

/**
 * Generate a complete, copy-ready AI prompt for external AI tools.
 * The prompt instructs the AI to produce structured JSON output compatible
 * with EdTechra's Knowledge Bitz V2 schema (5 quizzes, 100-word readings).
 *
 * NOTE: The AI auto-assigns the appropriate subtopic — admin does NOT manually select one.
 */
export function generateBitzAiPrompt(config: AiPromptConfig): string {
  const category = getCategoryById(config.categoryId);
  const cefr = getCefrLevelById(config.cefrLevel);
  const subtopicsList = category.subtopics.map((st) => st.name).join(', ');

  return `You are an expert educational content writer for EdTechra, a microlearning platform.

Generate exactly ${config.quantity} unique Knowledge Bitz (micro-learning facts) about **${category.name}** for English learners at **CEFR level ${cefr.id} (${cefr.shortLabel})**.

## Category: ${category.name}
${category.description}

## Available Subtopics
When creating each fact, assign the most appropriate subtopic from this list:
${category.subtopics.map((st) => `- **${st.name}**${st.description ? `: ${st.description}` : ''}`).join('\n')}

## CEFR Level Writing Guidelines
${cefr.promptInstructions}

## Content Requirements

Each Knowledge Bitz item MUST contain ALL of the following fields:

### 1. title (string)
A curiosity-driven hook headline (5–15 words). Make it surprising, fascinating, or counter-intuitive.
Examples: "Octopuses Have Three Hearts", "The Great Wall Cannot Be Seen from Space", "Your Brain Uses 20% of Your Energy".

### 2. short_fact (string)
A 20–30 word supporting explanation that expands on the title. This is what users see on the discovery card. Must be EXACTLY 20–30 words. Count carefully.

### 3. reading_text (string)
A clear educational explanation of EXACTLY 100 words. Not 99. Not 101. Exactly 100 words. Count every word carefully.
- Explain the fact clearly using the CEFR ${cefr.id} English level
- Teach exactly one clear idea
- Remain interesting and engaging
- Do NOT repeat the title or short_fact unnecessarily
- Flow naturally as a coherent mini-article
${(config.categoryId === 'history_culture' || config.categoryId === 'mysteries_legends') ? '\n- For myths, legends, and mysteries: clearly distinguish factual information from legends, claims, and uncertainty. Use phrases like "according to legend", "the story claims", or "this remains an unsolved mystery".\n' : ''}${(config.categoryId === 'personal_growth') ? '\n- For personal growth: focus on actionable psychological insights, habit science, communication techniques, and evidence-based self-improvement concepts.\n' : ''}
### 4. category (string)
Must be exactly: "${category.name}"

### 5. subtopic (string)
Must be one of: ${subtopicsList}
Choose the most appropriate subtopic based on the fact's content.

### 6. difficulty (string)
One of "Easy", "Medium", or "Hard" (knowledge difficulty, NOT English difficulty).

### 7. cefr_level (string)
Must be exactly: "${cefr.id}"

### 8. source_citation (string)
A reliable reference or source for the fact. Use well-known sources (Wikipedia, NASA, Nature, BBC, National Geographic, Smithsonian, etc.). If you cannot confidently provide a source, write "Requires administrator review" — do NOT fabricate URLs.

### 9. quiz (array of exactly 5 objects)
An array of EXACTLY 5 multiple-choice quiz questions. Each question object must contain:
- **question** (string): A clear question answerable from the reading_text (1 sentence)
- **options** (array of 4 strings): Exactly 4 answer options
- **correct_answer** (string): The exact text of the correct option (must match one of the 4 options EXACTLY)
- **explanation** (string): A brief 1–2 sentence explanation of why the answer is correct
- **xp** (number): Always set to 2

The 5 questions should test different aspects of the reading. Questions must be clearly derivable from the reading_text.

## Strict Rules

- Create ORIGINAL educational content based on real, verified facts.
- ONE fact per Bitz — do not combine multiple unrelated facts.
- Do NOT repeat facts or rephrase the same idea with different wording.
- Do NOT generate images or image descriptions.
- Do NOT create trick quiz questions or questions unrelated to the reading.
- short_fact MUST be 20–30 words. Count carefully.
- reading_text MUST be EXACTLY 100 words. Count every single word.
- quiz MUST be an array of EXACTLY 5 question objects.
- Every fact must be scientifically/historically accurate.
- Avoid controversial, political, religious, or sensitive content.

=============================================================================
STRICT MACHINE-READABLE OUTPUT FORMAT: SINGLE JSON ARRAY ONLY
=============================================================================
You MUST return ONLY a single valid JSON array starting with [ and ending with ].
Do NOT wrap the array in an object (e.g. do NOT use {"bitz": [...]}).
Do NOT use Markdown code fences (NO \`\`\` or \`\`\`json).
Do NOT include any introduction, greeting, headings, or explanation before the JSON array.
Do NOT include any conclusion, notes, summary, or commentary after the JSON array.
Do NOT include comments or multiple JSON documents.

JSON Schema:
[
  {
    "title": "A curiosity-driven headline",
    "short_fact": "A 20-30 word supporting explanation.",
    "reading_text": "A clear educational explanation of EXACTLY 100 words.",
    "category": "${category.name}",
    "subtopic": "${category.subtopics[0]?.name || 'General'}",
    "difficulty": "Easy",
    "cefr_level": "${cefr.id}",
    "source_citation": "Authoritative reference source or 'Requires administrator review'",
    "quiz": [
      {
        "question": "Question 1 derived from reading text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 2 derived from reading text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 3 derived from reading text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 4 derived from reading text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 5 derived from reading text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      }
    ]
  }
]

Generate exactly ${config.quantity} unique, high-quality, factually accurate Knowledge Bitz in this JSON array.
CRITICAL REMINDERS:
- short_fact = 20–30 words (count!)
- reading_text = EXACTLY 100 words (count every word!)
- quiz = EXACTLY 5 questions, each with 4 options, 1 correct_answer, explanation, xp=2

Return ONLY the raw JSON array. Start with [ and end with ].`;
}

// ============================================================================
// BACKWARD COMPAT — Keep old function name working
// ============================================================================

/** @deprecated — Use generateBitzAiPrompt with categoryId instead of topicId */
export { generateBitzAiPrompt as generateBitzPrompt };
