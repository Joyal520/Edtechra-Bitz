// ============================================================================
// EDTECHRA-BITZ: Ready-Made Pedagogical Live Quizzes Bank (Student-Safe)
// ============================================================================

import { LiveQuiz, LiveQuizQuestion } from '@/types/liveQuiz';

function buildClientSafeQuestions(title: string, category: string): LiveQuizQuestion[] {
  const templates: Record<string, Array<{ q: string; opts: [string, string, string, string] }>> = {
    'Basic Grammar': [
      { q: 'Which of the following is a noun?', opts: ['Quickly', 'Elephant', 'Blue', 'Run'] },
      { q: 'Identify the verb in the sentence: "The children played in the park."', opts: ['Children', 'Park', 'Played', 'The'] },
      { q: 'Choose the correct article: "She bought ___ umbrella."', opts: ['a', 'an', 'the', 'some'] },
      { q: 'Which sentence is grammatically correct?', opts: ['He don’t know.', 'He doesn’t know.', 'He not know.', 'He know not.'] },
      { q: 'What is the plural of "child"?', opts: ['Childs', 'Children', 'Childrens', 'Childes'] }
    ],
    'Tenses Quiz': [
      { q: 'Which sentence is in the past continuous tense?', opts: ['I was reading a book.', 'I read a book.', 'I will read a book.', 'I have read a book.'] },
      { q: '"She has lived in London for five years." Which tense is this?', opts: ['Simple Past', 'Present Perfect', 'Past Perfect', 'Future Perfect'] },
      { q: 'Choose the correct future form: "By tomorrow, we ___ the project."', opts: ['will finish', 'will have finished', 'finished', 'finishing'] },
      { q: 'Yesterday, they ___ to the museum.', opts: ['go', 'gone', 'went', 'going'] }
    ],
    'ICT Basics': [
      { q: 'What does "CPU" stand for in computing?', opts: ['Central Processing Unit', 'Computer Power Unit', 'Central Program Utility', 'Core Peripheral Unit'] },
      { q: 'Which of these is an example of an input device?', opts: ['Monitor', 'Keyboard', 'Speaker', 'Printer'] },
      { q: 'What does URL stand for in internet terminology?', opts: ['Uniform Resource Locator', 'Universal Record Link', 'Unified Resource Language', 'Universal Routing Logic'] },
      { q: 'Which file extension typically denotes an image file?', opts: ['.docx', '.png', '.mp3', '.exe'] }
    ],
    'AI Basics': [
      { q: 'What does "AI" stand for?', opts: ['Automated Internet', 'Artificial Intelligence', 'Algorithmic Input', 'Advanced Integration'] },
      { q: 'Which field of AI allows computers to learn from data patterns without explicit programming?', opts: ['Quantum Computing', 'Machine Learning', 'Computer Graphics', 'Database Management'] },
      { q: 'What is a neural network in AI inspired by?', opts: ['Computer motherboards', 'The human brain & neurons', 'Internet cables', 'Telephone switches'] },
      { q: 'Which of the following is a conversational AI model?', opts: ['Large Language Model (LLM)', 'Relational Database', 'Video Decoder', 'Rasterizer'] }
    ],
    'Solar System': [
      { q: 'Which is the largest planet in our solar system?', opts: ['Mars', 'Saturn', 'Jupiter', 'Neptune'] },
      { q: 'Which planet is known as the "Red Planet"?', opts: ['Venus', 'Mars', 'Mercury', 'Saturn'] },
      { q: 'What is the closest planet to the Sun?', opts: ['Mercury', 'Venus', 'Earth', 'Mars'] },
      { q: 'Which celestial body is at the center of our solar system?', opts: ['The Moon', 'The Sun', 'Jupiter', 'Polaris'] }
    ]
  };

  if (templates[title]) {
    return templates[title].map((item, idx) => ({
      id: `q_${title.toLowerCase().replace(/\s+/g, '_')}_${idx + 1}`,
      question: item.q,
      options: item.opts,
      durationSec: 20
    }));
  }

  // Fallback generation for other topics
  return Array.from({ length: 6 }, (_, index) => ({
    id: `q_${title.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`,
    question: `${title}: Question ${index + 1} on core concepts`,
    options: [
      `Key concept A in ${category}`,
      `Primary principle B in ${category}`,
      `Essential application C in ${category}`,
      `Advanced method D in ${category}`
    ],
    durationSec: 20
  }));
}

export const READY_MADE_QUIZZES: LiveQuiz[] = [
  {
    id: 'basic-grammar',
    title: 'Basic Grammar',
    category: 'Grammar',
    difficulty: 'Easy',
    accent_color: '#8b5cf6',
    description: 'Practice nouns, verbs, articles, and simple sentence rules.',
    questions: buildClientSafeQuestions('Basic Grammar', 'Grammar'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'tenses-quiz',
    title: 'Tenses Quiz',
    category: 'Grammar',
    difficulty: 'Medium',
    accent_color: '#7c3aed',
    description: 'Review present, past, and future tense patterns.',
    questions: buildClientSafeQuestions('Tenses Quiz', 'Grammar'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ict-basics',
    title: 'ICT Basics',
    category: 'ICT',
    difficulty: 'Easy',
    accent_color: '#026fc3',
    description: 'Explore computers, hardware, software, and online tools.',
    questions: buildClientSafeQuestions('ICT Basics', 'ICT'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ai-basics',
    title: 'AI Basics',
    category: 'AI',
    difficulty: 'Medium',
    accent_color: '#06b6d4',
    description: 'Introduce artificial intelligence, machine learning, and neural models.',
    questions: buildClientSafeQuestions('AI Basics', 'AI'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'solar-system',
    title: 'Solar System',
    category: 'Science',
    difficulty: 'Medium',
    accent_color: '#f59e0b',
    description: 'Learn planets, moons, orbits, and space astronomy facts.',
    questions: buildClientSafeQuestions('Solar System', 'Science'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'vocabulary-sprint',
    title: 'Vocabulary Sprint',
    category: 'Vocabulary',
    difficulty: 'Easy',
    accent_color: '#ec4899',
    description: 'Build confidence with high-frequency academic and everyday words.',
    questions: buildClientSafeQuestions('Vocabulary Sprint', 'Vocabulary'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'human-body',
    title: 'Human Body',
    category: 'Science',
    difficulty: 'Medium',
    accent_color: '#10b981',
    description: 'Review major organs, body systems, nutrition, and healthy habits.',
    questions: buildClientSafeQuestions('Human Body', 'Science'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'reading-check',
    title: 'Reading Check',
    category: 'Reading',
    difficulty: 'Easy',
    accent_color: '#3b82f6',
    description: 'Practice comprehension with quick passage inference and context clues.',
    questions: buildClientSafeQuestions('Reading Check', 'Reading'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'life-skills',
    title: 'Life Skills',
    category: 'Life Skills',
    difficulty: 'Easy',
    accent_color: '#f97316',
    description: 'Discuss smart choices, teamwork, problem solving, and digital safety.',
    questions: buildClientSafeQuestions('Life Skills', 'Life Skills'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'internet-safety',
    title: 'Internet Safety',
    category: 'ICT',
    difficulty: 'Easy',
    accent_color: '#0ea5e9',
    description: 'Learn passwords, privacy settings, phishing awareness, and safe browsing.',
    questions: buildClientSafeQuestions('Internet Safety', 'ICT'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'python-basics',
    title: 'Python Basics',
    category: 'ICT',
    difficulty: 'Medium',
    accent_color: '#14b8a6',
    description: 'Introduction to variables, data types, loops, and conditional statements.',
    questions: buildClientSafeQuestions('Python Basics', 'ICT'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'world-facts',
    title: 'World Facts',
    category: 'General Knowledge',
    difficulty: 'Medium',
    accent_color: '#eab308',
    description: 'Explore countries, capitals, continents, landmarks, and world records.',
    questions: buildClientSafeQuestions('World Facts', 'General Knowledge'),
    is_public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
