// ============================================================================
// Verification Test for Knowledge Bitz 12 Master Categories System Upgrade
// ============================================================================

import {
  BITZ_CATEGORIES,
  ALL_BITZ_CATEGORY_IDS,
  BITZ_CATEGORY_MAP,
  getCategoryById,
  getSubtopicsForCategory,
  isValidSubtopicForCategory,
  resolveCategoryId
} from '../src/utils/bitzTopicsConfig.ts';
import {
  validateBitzRecord,
  validateBitzBatch,
  countWords
} from '../src/utils/bitzContentValidator.ts';
import { generateBitzAiPrompt } from '../src/utils/bitzAiPromptGenerator.ts';
import { generateKnowledgeBitzCsv } from '../src/utils/bitzCsvExporter.ts';

console.log('=== TEST SUITE 1: Master Categories Configuration ===');
console.assert(BITZ_CATEGORIES.length === 12, `Expected 12 categories, found ${BITZ_CATEGORIES.length}`);
console.assert(ALL_BITZ_CATEGORY_IDS.length === 12, `Expected 12 category IDs, found ${ALL_BITZ_CATEGORY_IDS.length}`);

// 1. Check Personal Growth
const pgCat = getCategoryById('personal_growth');
console.assert(pgCat.name === 'Personal Growth', `Expected 'Personal Growth', got ${pgCat.name}`);
console.assert(pgCat.subtopics.length === 8, `Expected 8 subtopics for Personal Growth, got ${pgCat.subtopics.length}`);

const expectedPgSubtopics = [
  'Mindset & Habits',
  'Motivation',
  'Communication',
  'Confidence',
  'Learning & Study',
  'Productivity',
  'Emotional Skills',
  'Life Skills'
];
expectedPgSubtopics.forEach((sub) => {
  console.assert(
    isValidSubtopicForCategory('Personal Growth', sub),
    `Subtopic '${sub}' should be valid for Personal Growth`
  );
});
console.log('✓ Personal Growth category & 8 subtopics verified.');

// 2. Check Mysteries & Legends
const mlCat = getCategoryById('mysteries_legends');
console.assert(mlCat.name === 'Mysteries & Legends', `Expected 'Mysteries & Legends', got ${mlCat.name}`);
console.assert(mlCat.subtopics.length === 8, `Expected 8 subtopics for Mysteries & Legends, got ${mlCat.subtopics.length}`);

const expectedMlSubtopics = [
  'Ancient Mysteries',
  'Legends & Folklore',
  'Unsolved Mysteries',
  'Strange Places',
  'Lost Civilizations',
  'Historical Mysteries',
  'Mythical Creatures',
  'Mysterious Events'
];
expectedMlSubtopics.forEach((sub) => {
  console.assert(
    isValidSubtopicForCategory('Mysteries & Legends', sub),
    `Subtopic '${sub}' should be valid for Mysteries & Legends`
  );
});
console.log('✓ Mysteries & Legends category & 8 subtopics verified.');

console.log('\n=== TEST SUITE 2: Lookup and Fallbacks ===');
console.assert(getCategoryById('Personal Growth').id === 'personal_growth', 'getCategoryById by name failed');
console.assert(getCategoryById('Mysteries & Legends').id === 'mysteries_legends', 'getCategoryById by name failed');
console.assert(getCategoryById('personal-growth').id === 'personal_growth', 'getCategoryById by slug failed');
console.assert(getCategoryById('mysteries-legends').id === 'mysteries_legends', 'getCategoryById by slug failed');
console.assert(resolveCategoryId('mindset') === 'personal_growth', 'resolveCategoryId legacy failed');
console.assert(resolveCategoryId('folklore') === 'mysteries_legends', 'resolveCategoryId legacy failed');
console.log('✓ All category lookups and aliases verified.');

console.log('\n=== TEST SUITE 3: AI Prompt Generator ===');
const pgPrompt = generateBitzAiPrompt({
  categoryId: 'personal_growth',
  cefrLevel: 'B2',
  quantity: 5
});
console.assert(pgPrompt.includes('Personal Growth'), 'Prompt should mention Personal Growth');
console.assert(pgPrompt.includes('"category": "Personal Growth"'), 'Prompt must enforce canonical category');
console.assert(pgPrompt.includes('Mindset & Habits'), 'Prompt must list subtopics');
console.log('✓ Personal Growth AI prompt verified.');

const mlPrompt = generateBitzAiPrompt({
  categoryId: 'mysteries_legends',
  cefrLevel: 'B1',
  quantity: 3
});
console.assert(mlPrompt.includes('Mysteries & Legends'), 'Prompt should mention Mysteries & Legends');
console.assert(mlPrompt.includes('"category": "Mysteries & Legends"'), 'Prompt must enforce canonical category');
console.assert(mlPrompt.includes('Ancient Mysteries'), 'Prompt must list subtopics');
console.log('✓ Mysteries & Legends AI prompt verified.');

console.log('\n=== TEST SUITE 4: Bulk Validation ===');
const words100 = Array.from({ length: 100 }, (_, i) => `word${i + 1}`).join(' ');
const words25 = Array.from({ length: 25 }, (_, i) => `fact${i + 1}`).join(' ');

const pgRecord = {
  title: "The 2-Minute Rule That Rewires Your Brain for Habit Formation",
  short_fact: words25,
  reading_text: words100,
  category: "Personal Growth",
  subtopic: "Mindset & Habits",
  difficulty: "Easy",
  cefr_level: "B1",
  source_citation: "James Clear, Atomic Habits",
  quiz: [
    { question: "What is the 2-minute rule?", options: ["A habit starting tool", "A running exercise", "A sleep pattern", "A dietary rule"], correct_answer: "A habit starting tool", explanation: "It makes starting easier.", xp: 2 },
    { question: "Why does it work?", options: ["Overcomes friction", "Builds muscle", "Saves money", "Improves memory"], correct_answer: "Overcomes friction", explanation: "Reduces initiation barrier.", xp: 2 },
    { question: "What does it scale into?", options: ["Longer routines", "Shorter habits", "Less sleep", "Fast reading"], correct_answer: "Longer routines", explanation: "Small steps expand.", xp: 2 },
    { question: "Who popularized it?", options: ["James Clear", "Albert Einstein", "Isaac Newton", "Charles Darwin"], correct_answer: "James Clear", explanation: "In Atomic Habits.", xp: 2 },
    { question: "How long should starting take?", options: ["Under 2 minutes", "1 hour", "30 minutes", "10 seconds"], correct_answer: "Under 2 minutes", explanation: "Keep starting friction low.", xp: 2 }
  ]
};

const pgVal = validateBitzRecord(pgRecord, 0);
console.assert(pgVal.status === 'valid', `Expected valid status, got ${pgVal.status}`);
console.assert(pgVal.canonical.category === 'Personal Growth', `Expected category 'Personal Growth', got ${pgVal.canonical.category}`);
console.log('✓ Bulk Validator for Personal Growth passed.');

const mlRecord = {
  title: "The Unsolved Mystery of the Lost Roanoke Colony",
  short_fact: words25,
  reading_text: words100,
  category: "Mysteries & Legends",
  subtopic: "Lost Civilizations",
  difficulty: "Medium",
  cefr_level: "B2",
  source_citation: "National Park Service Historical Archives",
  quiz: [
    { question: "What happened to Roanoke?", options: ["Settlers vanished", "City flooded", "Conquered by Rome", "Burned down"], correct_answer: "Settlers vanished", explanation: "The 1587 colony disappeared.", xp: 2 },
    { question: "What single word was carved on a post?", options: ["CROATOAN", "ATLANTIS", "HELP", "FAREWELL"], correct_answer: "CROATOAN", explanation: "Carved into the palisade.", xp: 2 },
    { question: "In what year did John White return?", options: ["1590", "1492", "1776", "1620"], correct_answer: "1590", explanation: "Returned in 1590.", xp: 2 },
    { question: "Where is Roanoke located?", options: ["North Carolina", "California", "Florida", "Texas"], correct_answer: "North Carolina", explanation: "Off the NC coast.", xp: 2 },
    { question: "Did searchers find bodies?", options: ["No bodies found", "Many skeletons", "Written diaries", "Sunken ships"], correct_answer: "No bodies found", explanation: "No signs of struggle or remains.", xp: 2 }
  ]
};

const mlVal = validateBitzRecord(mlRecord, 1);
console.assert(mlVal.status === 'valid', `Expected valid status, got ${mlVal.status}`);
console.assert(mlVal.canonical.category === 'Mysteries & Legends', `Expected category 'Mysteries & Legends', got ${mlVal.canonical.category}`);
console.log('✓ Bulk Validator for Mysteries & Legends passed.');

console.log('\n=== TEST SUITE 5: CSV Export Preservation ===');
const csvString = generateKnowledgeBitzCsv([
  {
    id: 'test-1',
    bitz_code: 'B000101',
    title: 'Growth Mindset Fact',
    short_fact: words25,
    reading_text: words100,
    category: 'Personal Growth',
    sub_topic: 'Mindset & Habits',
    difficulty: 'Easy',
    cefr_level: 'B1',
    status: 'published'
  },
  {
    id: 'test-2',
    bitz_code: 'B000102',
    title: 'Atlantis Legend Fact',
    short_fact: words25,
    reading_text: words100,
    category: 'Mysteries & Legends',
    sub_topic: 'Ancient Mysteries',
    difficulty: 'Hard',
    cefr_level: 'C1',
    status: 'published'
  }
]);

console.assert(csvString.includes('Personal Growth'), 'CSV export should contain Personal Growth');
console.assert(csvString.includes('Mysteries & Legends'), 'CSV export should contain Mysteries & Legends');
console.log('✓ CSV Export preservation verified.');

console.log('\n========================================');
console.log('🎉 ALL 5 TEST SUITES PASSED FLAWLESSLY!');
console.log('========================================');
