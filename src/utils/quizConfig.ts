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
}
`;

// ============================================================================
// Spelling Scramble Configuration & Defaults
// ============================================================================

export const SPELLING_SCRAMBLE_CONFIG = {
  ENABLED: true,
  FEED_INTERVAL_MIN: 4,
  FEED_INTERVAL_MAX: 6,
  FEED_POOL_SIZE: 10,

  VALID_DIFFICULTIES: ['Easy', 'Medium', 'Hard'] as const,

  // Difficulty-to-Timer mapping (seconds) — NEVER overridden by JSON
  DIFFICULTY_TIMERS: {
    Easy: 30,
    Medium: 45,
    Hard: 60
  } as const,

  // Difficulty-to-XP mapping
  DIFFICULTY_XP: {
    Easy: 10,
    Medium: 15,
    Hard: 20
  } as const
} as const;

/**
 * AI Spelling Scramble Generator Prompt Template for ChatGPT / Claude / Gemini
 */
export const AI_SPELLING_SCRAMBLE_PROMPT_TEMPLATE = `Generate {COUNT} high-quality, engaging English "Spelling Scramble" vocabulary challenges for the microlearning platform EdTechra Bits.
Topic focus: {TOPIC}
Difficulty focus: {DIFFICULTY}
Target audience: English learners, curious students, and spelling enthusiasts.

CRITICAL INSTRUCTIONS:
1. Return strictly valid JSON matching the exact schema below.
2. DO NOT wrap the output in Markdown code fences (e.g. no \`\`\`json or \`\`\`). Output pure JSON only.
3. Every spelling activity must have:
   - "word": Single valid English word in UPPERCASE (no spaces, 4 to 12 letters).
   - "scrambledLetters": Array of single uppercase letters representing the EXACT letters of the word, thoroughly scrambled (e.g. ["P", "E", "L", "E", "H", "A", "N", "T"]). Must contain EXACT same count and multiset of letters.
   - "clue": 1 clear, engaging, concise sentence defining or describing the word without containing the word itself.
   - "category": One of: "Nature", "Technology", "Science", "Daily Life", "Vocabulary", "Space", "Geography", "History", "General".
   - "difficulty": One of: "Easy", "Medium", "Hard".
   - "xp": Positive integer (Easy: 10, Medium: 15, Hard: 20).
4. No duplicate words within the batch.
5. Difficulty guidelines:
   - Easy (4-6 letter words, 30s timer): e.g. APPLE, WATER, PLANET, TIGER, ROBOT.
   - Medium (6-8 letter words, 45s timer): e.g. COMPUTER, DINOSAUR, DOLPHIN, MOUNTAIN.
   - Hard (8-12 letter words, 60s timer): e.g. ELEPHANT, ASTRONAUT, ARCHITECTURE, DISCOVERY.

JSON SCHEMA:
{
  "spellingScrambles": [
    {
      "word": "ELEPHANT",
      "scrambledLetters": ["P", "E", "L", "E", "H", "A", "N", "T"],
      "clue": "A very large animal with a long trunk.",
      "category": "Nature",
      "difficulty": "Easy",
      "xp": 10
    },
    {
      "word": "COMPUTER",
      "scrambledLetters": ["P", "U", "T", "E", "C", "R", "O", "M"],
      "clue": "A machine used to work with digital information.",
      "category": "Technology",
      "difficulty": "Medium",
      "xp": 15
    }
  ]
}`;

