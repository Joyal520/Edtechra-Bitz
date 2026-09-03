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
Examples: "Octopuses Have Three Hearts", "The Great Wall Cannot Be Seen from Space", "The Endowment Effect".

### 2. subtitle (string, optional)
A concise secondary subtitle (4–10 words) elaborating on the hook.
Example: "Why we value our own things more".

### 3. short_fact (string)
A 20–30 word supporting explanation that expands on the title. This is what users see on the discovery card. Must be EXACTLY 20–30 words. Count carefully.

### 4. reading_sections (array of EXACTLY 3 objects)
The core educational reading chunked into EXACTLY 3 progressive Question + Answer learning cards.
Each object must contain:
- **number** (number): 1, 2, or 3
- **question** (string): A natural, engaging question suited to CEFR ${cefr.id} English
- **answer** (string): A clear, readable answer
Questions should guide the learner progressively:
- Section 1 (Q1): What is it / core concept?
- Section 2 (Q2): How does it work / why does it happen / real-world example?
- Section 3 (Q3): Why is it important / what does it mean for us / where can we see it?
The THREE ANSWERS COMBINED MUST TOTAL APPROXIMATELY 100 WORDS (count every answer word, target 90–110 words total). Do NOT count the questions in the 100-word count.

### 5. reading_text (string)
The full combined reading text of all 3 answers joined together (EXACTLY ~100 words). Provided for backward compatibility.

### 6. key_takeaway (string)
A 1–2 sentence memorable takeaway summarizing the core lesson (15–30 words).
Example: "We tend to value things more when we own them, and this influences our choices every day."

### 7. category (string)
Must be exactly: "${category.name}"

### 8. subtopic (string)
Must be one of: ${subtopicsList}
Choose the most appropriate subtopic based on the fact's content.

### 9. difficulty (string)
One of "Easy", "Medium", or "Hard" (knowledge difficulty, NOT English difficulty).

### 10. cefr_level (string)
Must be exactly: "${cefr.id}"

### 11. source_citation (string)
A reliable reference or source for the fact. Use well-known sources (Wikipedia, NASA, Nature, BBC, National Geographic, Smithsonian, etc.). If you cannot confidently provide a source, write "Requires administrator review" — do NOT fabricate URLs.

### 12. quiz (array of exactly 5 objects)
An array of EXACTLY 5 multiple-choice quiz questions. Each question object must contain:
- **question** (string): A clear question answerable from the reading_sections (1 sentence)
- **options** (array of 4 strings): Exactly 4 answer options
- **correct_answer** (string): The exact text of the correct option (must match one of the 4 options EXACTLY)
- **explanation** (string): A brief 1–2 sentence explanation of why the answer is correct
- **xp** (number): Always set to 2

The 5 questions should test different aspects of the reading. Questions must be clearly derivable from the reading_sections.

## Strict Rules

- Create ORIGINAL educational content based on real, verified facts.
- ONE fact per Bitz — do not combine multiple unrelated facts.
- Do NOT repeat facts or rephrase the same idea with different wording.
- Do NOT generate images or image descriptions.
- Do NOT create trick quiz questions or questions unrelated to the reading.
- short_fact MUST be 20–30 words. Count carefully.
- reading_sections MUST contain EXACTLY 3 question-answer objects.
- Combined answers of reading_sections MUST be ~100 words (90–110 words target).
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
    "subtitle": "Why we value our own things more",
    "short_fact": "A 20-30 word supporting explanation.",
    "reading_sections": [
      {
        "number": 1,
        "question": "What is the endowment effect?",
        "answer": "People often value something more when they own it. This is called the endowment effect."
      },
      {
        "number": 2,
        "question": "Why does ownership change how we feel?",
        "answer": "Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special."
      },
      {
        "number": 3,
        "question": "Why is the endowment effect important?",
        "answer": "The effect helps scientists understand how people make choices about buying, selling, and the things they own."
      }
    ],
    "reading_text": "People often value something more when they own it. This is called the endowment effect. Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special. The effect helps scientists understand how people make choices about buying, selling, and the things they own.",
    "key_takeaway": "We tend to value things more when we own them, and this influences our choices every day.",
    "category": "${category.name}",
    "subtopic": "${category.subtopics[0]?.name || 'General'}",
    "difficulty": "Easy",
    "cefr_level": "${cefr.id}",
    "source_citation": "Authoritative reference source or 'Requires administrator review'",
    "quiz": [
      {
        "question": "Question 1 derived from reading sections?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 2 derived from reading sections?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 3 derived from reading sections?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 4 derived from reading sections?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "explanation": "Why Option A is correct.",
        "xp": 2
      },
      {
        "question": "Question 5 derived from reading sections?",
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
- reading_sections = EXACTLY 3 question-answer objects, answers totaling ~100 words (count every answer word!)
- quiz = EXACTLY 5 questions, each with 4 options, 1 correct_answer, explanation, xp=2

Return ONLY the raw JSON array. Start with [ and end with ].`;
}

// ============================================================================
// BACKWARD COMPAT — Keep old function name working
// ============================================================================

/** @deprecated — Use generateBitzAiPrompt with categoryId instead of topicId */
export { generateBitzAiPrompt as generateBitzPrompt };
