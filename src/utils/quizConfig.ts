// ============================================================================
// EDTECHRA-BITZ: Interactive Quiz Configuration & Defaults
// ============================================================================

export const QUIZ_CONFIG = {
  // Feed integration settings
  ENABLED: true,
  MIN_POSTS_BETWEEN_QUIZZES: 2,
  MAX_POSTS_BETWEEN_QUIZZES: 4,
  FEED_POOL_SIZE: 10,
  DEFAULT_XP: 10,

  // Validation options
  VALID_DIFFICULTIES: ['Easy', 'Medium', 'Hard'] as const,
  VALID_CATEGORIES: [
    'General',
    'Science',
    'Technology',
    'AI',
    'History',
    'Math',
    'English',
    'Space',
    'Nature',
    'Psychology',
    'Life Skills',
    'Geography',
    'Mysteries'
  ] as const,
} as const;

/**
 * AI Quiz Generator Prompt Template for ChatGPT / Claude / Gemini
 */
export const AI_QUIZ_PROMPT_TEMPLATE = `Generate {COUNT} high-quality, engaging, educational multiple-choice quiz questions for the microlearning platform EdTechra Bits.
Topic focus: {TOPIC}
Target audience: curious students and microlearning enthusiasts.

CRITICAL INSTRUCTIONS:
1. Return strictly valid JSON matching the exact schema below.
2. DO NOT wrap the output in Markdown code fences (e.g. no \`\`\`json or \`\`\`). Output pure JSON only.
3. Every quiz must have:
   - "question": Concise, clear, mobile-friendly question text.
   - "options": An array of EXACTLY 4 unique, plausible, non-empty options.
   - "correctAnswer": A string that EXACTLY matches one of the 4 items in "options".
   - "explanation": 1-2 punchy sentences explaining why the answer is correct and providing educational value.
   - "category": One of: "Science", "Technology", "AI", "History", "Math", "English", "Space", "Nature", "Psychology", "Life Skills", "Geography", "General", "Mysteries".
   - "difficulty": One of: "Easy", "Medium", "Hard".
   - "xp": Positive integer (default 10).
4. No duplicate questions in the batch.
5. All facts must be 100% verified and reliable.

JSON SCHEMA:
{
  "quizzes": [
    {
      "question": "How many hearts does an octopus have?",
      "options": ["1", "2", "3", "4"],
      "correctAnswer": "3",
      "explanation": "An octopus has three hearts: two pump blood to the gills, while the third pumps it to the rest of the body.",
      "category": "Science",
      "difficulty": "Easy",
      "xp": 10
    }
  ]
}`;
