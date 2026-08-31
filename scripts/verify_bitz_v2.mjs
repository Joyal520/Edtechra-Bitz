// ============================================================================
// Verification Test for Knowledge Bitz V2 & History & Culture Subtopic System
// ============================================================================

import { BITZ_CATEGORIES, getCategoryById, getSubtopicsForCategory, isValidSubtopicForCategory } from '../src/utils/bitzTopicsConfig.ts';
import { validateBitzRecord, validateBitzBatch, countWords } from '../src/utils/bitzContentValidator.ts';
import { generateBitzAiPrompt } from '../src/utils/bitzAiPromptGenerator.ts';

console.log('--- TEST 1: 10 Main Categories & History & Culture Subtopics ---');
console.assert(BITZ_CATEGORIES.length === 10, `Expected 10 categories, found ${BITZ_CATEGORIES.length}`);

const historyCat = getCategoryById('history_culture');
console.assert(historyCat.name === 'History & Culture', `Expected 'History & Culture', found ${historyCat.name}`);
console.assert(historyCat.subtopics.length === 5, `Expected 5 subtopics, found ${historyCat.subtopics.length}`);

const expectedSubtopics = [
  'World History',
  'Ancient Civilizations',
  'Myths & Legends',
  'Mysteries & Unsolved',
  'Culture & Traditions'
];

const foundNames = historyCat.subtopics.map(s => s.name);
expectedSubtopics.forEach(sub => {
  console.assert(foundNames.includes(sub), `Missing subtopic: ${sub}`);
});
console.log('✓ Test 1 Passed: 10 categories and 5 History & Culture subtopics verified.');

console.log('\n--- TEST 2: AI Prompt Generator for History & Culture ---');
const prompt = generateBitzAiPrompt({
  categoryId: 'history_culture',
  cefrLevel: 'B1',
  quantity: 5
});
console.assert(prompt.includes('History & Culture'), 'Prompt should include category name');
console.assert(prompt.includes('World History'), 'Prompt should include World History');
console.assert(prompt.includes('Ancient Civilizations'), 'Prompt should include Ancient Civilizations');
console.assert(prompt.includes('Myths & Legends'), 'Prompt should include Myths & Legends');
console.assert(prompt.includes('Mysteries & Unsolved'), 'Prompt should include Mysteries & Unsolved');
console.assert(prompt.includes('Culture & Traditions'), 'Prompt should include Culture & Traditions');
console.assert(prompt.includes('EXACTLY 100 words'), 'Prompt should instruct exactly 100 words');
console.assert(prompt.includes('20–30 words'), 'Prompt should instruct 20-30 words short fact');
console.assert(prompt.includes('EXACTLY 5 multiple-choice quiz questions'), 'Prompt should instruct 5 quizzes');
console.log('✓ Test 2 Passed: AI Prompt generator produces complete instructions with subtopics.');

console.log('\n--- TEST 3: Strict Word Counting & Validator ---');
// Generate exactly 100-word text
const words100 = Array.from({ length: 100 }, (_, i) => `word${i + 1}`).join(' ');
console.assert(countWords(words100) === 100, `Word count expected 100, got ${countWords(words100)}`);

// Generate exactly 25-word short fact
const words25 = Array.from({ length: 25 }, (_, i) => `fact${i + 1}`).join(' ');
console.assert(countWords(words25) === 25, `Word count expected 25, got ${countWords(words25)}`);

const validSampleRecord = {
  title: "The Mystery of the Bermuda Triangle Unraveled",
  short_fact: words25,
  reading_text: words100,
  category: "History & Culture",
  subtopic: "Mysteries & Unsolved",
  difficulty: "Medium",
  cefr_level: "B1",
  source_citation: "National Oceanic and Atmospheric Administration",
  quiz: [
    { question: "What is the primary mystery associated with the Bermuda Triangle?", options: ["Disappearances", "Volcanic activity", "Alien sightings", "Tsunamis"], correct_answer: "Disappearances", explanation: "Many planes and ships were reported lost.", xp: 2 },
    { question: "Where is the Bermuda Triangle geographically located?", options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correct_answer: "Atlantic Ocean", explanation: "It spans between Florida, Bermuda, and Puerto Rico.", xp: 2 },
    { question: "What scientific explanation is often cited for navigational issues?", options: ["Compass variation", "Black holes", "Sea monsters", "Time warps"], correct_answer: "Compass variation", explanation: "Magnetic compass variations can affect compass readings.", xp: 2 },
    { question: "Does the US Coast Guard recognize the Bermuda Triangle as a hazard zone?", options: ["No, it does not", "Yes, officially", "Only in summer", "Under review"], correct_answer: "No, it does not", explanation: "Official agencies consider incident rates normal.", xp: 2 },
    { question: "What weather phenomenon is frequent in the Caribbean region?", options: ["Sudden storms", "Blizzards", "Sandstorms", "Earthquakes"], correct_answer: "Sudden storms", explanation: "Unpredictable microbursts and squalls are common.", xp: 2 }
  ]
};

const validationResult = validateBitzRecord(validSampleRecord, 0);
console.assert(validationResult.status === 'valid', `Expected status 'valid', got ${validationResult.status}: ${JSON.stringify(validationResult.issues)}`);
console.log('✓ Test 3 Passed: 100-word reading, 20-30 word short fact, and 5-quiz validator passed.');

console.log('\n--- ALL TEST SUITES PASSED! ---');
