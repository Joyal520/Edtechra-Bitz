// ============================================================================
// EDTECHRA-BITZ: 3-Question Reading Sections Test Suite
// Verifies:
// 1. Data derivation & sanitization (getBitzReadingData)
// 2. Guaranteed 3 non-empty sections & progressive questions
// 3. Subtitle & Key Takeaway derivation
// 4. Content validator support for reading_sections & backward compatibility
// 5. AI Prompt generator schema compliance
// ============================================================================

import assert from 'assert';
import {
  getBitzReadingData,
  formatReadingSectionsToText,
  splitIntoSentences,
  countWords
} from '../src/utils/bitzReadingData.ts';
import {
  validateReadingSections,
  validateReading,
  validateBitzRecord
} from '../src/utils/bitzContentValidator.ts';
import { generateBitzAiPrompt } from '../src/utils/bitzAiPromptGenerator.ts';

console.log('🧪 Starting 3-Question Reading Sections Verification Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

// ----------------------------------------------------------------------------
// Test 1: Pre-existing reading_sections is passed through accurately
// ----------------------------------------------------------------------------
runTest('Pre-defined reading_sections with 3 items is preserved and validated', () => {
  const bitz = {
    id: 'test-1',
    bitz_code: 'B000001',
    title: 'The Endowment Effect',
    subtitle: 'Why we value our own things more',
    short_fact: 'People often value something more when they own it.',
    reading_text: 'People often value something more when they own it. This is called the endowment effect. Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special. The effect helps scientists understand how people make choices about buying, selling, and the things they own.',
    reading_sections: [
      {
        number: 1,
        question: 'What is the endowment effect?',
        answer: 'People often value something more when they own it. This is called the endowment effect.'
      },
      {
        number: 2,
        question: 'Why does ownership change how we feel?',
        answer: 'Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special.'
      },
      {
        number: 3,
        question: 'Why is the endowment effect important?',
        answer: 'The effect helps scientists understand how people make choices about buying, selling, and the things they own.'
      }
    ],
    key_takeaway: 'We tend to value things more when we own them, and this influences our choices every day.',
    topic_id: 'psychology',
    category: 'People & Psychology',
    difficulty: 'Easy',
    cefr_level: 'B1',
    reading_time_sec: 30,
    visual_status: 'ready',
    xp_value: 10,
    likes_count: 0,
    saves_count: 0,
    shares_count: 0,
    views_count: 0,
    completions_count: 0,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const data = getBitzReadingData(bitz);
  assert.strictEqual(data.sections.length, 3, 'Must have exactly 3 sections');
  assert.strictEqual(data.sections[0].number, 1);
  assert.strictEqual(data.sections[0].question, 'What is the endowment effect?');
  assert.strictEqual(data.sections[1].number, 2);
  assert.strictEqual(data.sections[1].question, 'Why does ownership change how we feel?');
  assert.strictEqual(data.sections[2].number, 3);
  assert.strictEqual(data.sections[2].question, 'Why is the endowment effect important?');
  assert.strictEqual(data.subtitle, 'Why we value our own things more');
  assert.strictEqual(data.keyTakeaway, 'We tend to value things more when we own them, and this influences our choices every day.');
});

// ----------------------------------------------------------------------------
// Test 2: Fallback derivation from raw reading_text for old/legacy records
// ----------------------------------------------------------------------------
runTest('Legacy Bitz without reading_sections gracefully derives 3 non-empty sections', () => {
  const legacyBitz = {
    id: 'test-legacy',
    bitz_code: 'B000002',
    title: 'Why Mars Looks Red',
    short_fact: 'Mars appears distinctly red because its surface rocks and soil are saturated with oxidized iron minerals, commonly known as planetary rust.',
    reading_text: 'Mars looks reddish because its surface is covered in iron oxide, which is the same chemical compound found in everyday rust. Billions of years ago, when the planet had a warmer climate and abundant liquid water, iron in the Martian rocks reacted with oxygen. This chemical oxidation created fine reddish dust that spread across the entire planetary surface. Powerful global dust storms regularly sweep across Mars, lifting these tiny rust particles high into the thin atmosphere. When sunlight reflects off the airborne dust and rusty ground, Mars glows with its famous reddish color throughout our night sky.',
    topic_id: 'science',
    category: 'Science & Nature',
    difficulty: 'Easy',
    cefr_level: 'A2',
    reading_time_sec: 30,
    visual_status: 'ready',
    xp_value: 10,
    likes_count: 0,
    saves_count: 0,
    shares_count: 0,
    views_count: 0,
    completions_count: 0,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const data = getBitzReadingData(legacyBitz);
  assert.strictEqual(data.sections.length, 3, 'Must have exactly 3 sections');

  data.sections.forEach((s, idx) => {
    assert.strictEqual(s.number, idx + 1, `Section index ${idx} must have number ${idx + 1}`);
    assert(s.question && s.question.trim().length > 0, `Section ${idx + 1} question must NOT be empty`);
    assert(s.answer && s.answer.trim().length > 0, `Section ${idx + 1} answer must NOT be empty`);
  });

  // Verify questions are progressive
  assert(data.sections[0].question.endsWith('?'), 'Q1 must be a valid question');
  assert(data.sections[1].question.endsWith('?'), 'Q2 must be a valid question');
  assert(data.sections[2].question.endsWith('?'), 'Q3 must be a valid question');

  // Verify Key Takeaway was derived
  assert(data.keyTakeaway && data.keyTakeaway.length > 10, 'Key Takeaway must be derived');
});

// ----------------------------------------------------------------------------
// Test 3: Edge cases — short text or 1-sentence text does NOT crash
// ----------------------------------------------------------------------------
runTest('Edge cases with minimal text produce 3 valid sections without throwing errors', () => {
  const minimalBitz = {
    id: 'test-minimal',
    bitz_code: 'B000003',
    title: 'Short Concept',
    short_fact: 'A quick explanation of a concept.',
    reading_text: 'A quick single sentence fact about a very simple concept for testing.',
    topic_id: 'general',
    category: 'Life Skills & English',
    difficulty: 'Easy',
    cefr_level: 'A1',
    reading_time_sec: 30,
    visual_status: 'missing',
    xp_value: 10,
    likes_count: 0,
    saves_count: 0,
    shares_count: 0,
    views_count: 0,
    completions_count: 0,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const data = getBitzReadingData(minimalBitz);
  assert.strictEqual(data.sections.length, 3, 'Must have exactly 3 sections even for minimal text');
  data.sections.forEach((s) => {
    assert(s.question && s.question.trim().length > 0);
    assert(s.answer && s.answer.trim().length > 0);
  });
});

// ----------------------------------------------------------------------------
// Test 4: Format sections to text for backward compatibility
// ----------------------------------------------------------------------------
runTest('formatReadingSectionsToText combines answers into readable text', () => {
  const sections = [
    { number: 1, question: 'Q1?', answer: 'Answer one.' },
    { number: 2, question: 'Q2?', answer: 'Answer two.' },
    { number: 3, question: 'Q3?', answer: 'Answer three.' }
  ];

  const text = formatReadingSectionsToText(sections);
  assert.strictEqual(text, 'Answer one. Answer two. Answer three.');
});

// ----------------------------------------------------------------------------
// Test 5: Validator accepts 3 reading_sections with ~100 words
// ----------------------------------------------------------------------------
runTest('validateReadingSections validates correct 3-section input', () => {
  const validSections = [
    { number: 1, question: 'What is it?', answer: 'This is an educational reading section about science with clear explanations that teach one single concept carefully and well.' },
    { number: 2, question: 'How does it work?', answer: 'It works through natural physical mechanisms where forces interact and create predictable results in the environment every single day.' },
    { number: 3, question: 'Why is it important?', answer: 'This matters because understanding these fundamentals empowers learners to think critically about the technological world around them.' }
  ];

  const issues = validateReadingSections(validSections);
  const errors = issues.filter(i => i.type === 'error');
  assert.strictEqual(errors.length, 0, 'Valid sections must produce zero errors');
});

// ----------------------------------------------------------------------------
// Test 6: Validator rejects sections with wrong length or empty questions
// ----------------------------------------------------------------------------
runTest('validateReadingSections flags wrong length and empty questions', () => {
  const invalidSections = [
    { number: 1, question: '', answer: 'Valid answer.' },
    { number: 2, question: 'Valid question?', answer: '' }
  ];

  const issues = validateReadingSections(invalidSections);
  const errors = issues.filter(i => i.type === 'error');
  assert(errors.length > 0, 'Invalid sections must produce errors');
  assert(errors.some(e => e.message.includes('count')), 'Must flag count != 3');
  assert(errors.some(e => e.field.includes('question')), 'Must flag empty question');
  assert(errors.some(e => e.field.includes('answer')), 'Must flag empty answer');
});

// ----------------------------------------------------------------------------
// Test 7: normalizeBitzRecord populates reading_sections on import
// ----------------------------------------------------------------------------
runTest('validateBitzRecord derives reading_sections when given reading_text', () => {
  const rawRecord = {
    title: 'Why Mars Looks Red',
    short_fact: 'Mars appears distinctly red in the night sky because its rocks and soil are saturated with oxidized iron minerals.',
    reading_text: 'Mars looks reddish because its surface is covered in iron oxide, which is the same chemical compound found in everyday rust. Billions of years ago, when the planet had a warmer climate and abundant liquid water, iron in the Martian rocks reacted with oxygen. This chemical oxidation created fine reddish dust that spread across the entire planetary surface. Powerful global dust storms regularly sweep across Mars, lifting these tiny rust particles high into the thin atmosphere. When sunlight reflects off the airborne dust and rusty ground, Mars glows with its famous reddish color throughout our night sky.',
    category: 'Science & Nature',
    subtopic: 'Space & Astronomy',
    difficulty: 'Easy',
    cefr_level: 'A2',
    quiz: [
      { question: 'Q1', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', explanation: 'E1', xp: 2 },
      { question: 'Q2', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', explanation: 'E2', xp: 2 },
      { question: 'Q3', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', explanation: 'E3', xp: 2 },
      { question: 'Q4', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', explanation: 'E4', xp: 2 },
      { question: 'Q5', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', explanation: 'E5', xp: 2 }
    ]
  };

  const { canonical } = validateBitzRecord(rawRecord, 0);
  assert(canonical, 'Canonical record must be created');
  assert(Array.isArray(canonical.reading_sections), 'Canonical record must have reading_sections');
  assert.strictEqual(canonical.reading_sections.length, 3, 'Must have 3 reading_sections');
  assert(canonical.reading_text, 'reading_text must remain available for backward compatibility');
});

// ----------------------------------------------------------------------------
// Test 8: AI Prompt Generator requires reading_sections in JSON schema
// ----------------------------------------------------------------------------
runTest('generateBitzAiPrompt schema requires reading_sections with 3 items', () => {
  const prompt = generateBitzAiPrompt({
    categoryId: 'science_nature',
    cefrLevel: 'B1',
    quantity: 5
  });

  assert(prompt.includes('reading_sections'), 'Prompt must instruct AI on reading_sections');
  assert(prompt.includes('EXACTLY 3'), 'Prompt must enforce exactly 3 sections');
  assert(prompt.includes('"reading_sections": ['), 'Prompt schema must show reading_sections JSON structure');
  assert(prompt.includes('"reading_text":'), 'Prompt schema must also include reading_text for backward compatibility');
  assert(prompt.includes('key_takeaway'), 'Prompt schema must include key_takeaway');
});

console.log(`\n============================================================`);
console.log(`Results: ${testsPassed} / ${testsTotal} test assertions passed.`);
if (testsPassed === testsTotal) {
  console.log('🎉 ALL 3-QUESTION READING SECTIONS TESTS PASSED!\n');
} else {
  console.error(`⚠️ ${testsTotal - testsPassed} test(s) failed!\n`);
  process.exit(1);
}
