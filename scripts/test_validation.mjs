// ============================================================================
// Direct Node.js Test Suite for Quiz Batch Validation & Sanitization
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal importable validation logic to test algorithms
function sanitizeJsonInput(input) {
  let cleaned = input.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }
  return cleaned.trim();
}

function validateSingleQuiz(item, seenQuestions) {
  const errors = [];
  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['Item is not a valid JSON object.'] };
  }

  const question = typeof item.question === 'string' ? item.question.trim() : '';
  if (!question) {
    errors.push('Question is missing or empty.');
  } else {
    const normalizedQ = question.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(normalizedQ)) {
      errors.push('Duplicate question detected in this batch.');
    } else {
      seenQuestions.add(normalizedQ);
    }
  }

  const options = Array.isArray(item.options) ? item.options.map(opt => String(opt ?? '').trim()) : [];
  if (!Array.isArray(item.options)) {
    errors.push('Options must be an array.');
  } else if (options.length !== 4) {
    errors.push(`Options must have exactly 4 items (found ${options.length}).`);
  } else {
    const emptyCount = options.filter(opt => opt.length === 0).length;
    if (emptyCount > 0) errors.push('All 4 options must be non-empty strings.');
    const uniqueOptions = new Set(options.map(opt => opt.toLowerCase()));
    if (uniqueOptions.size < options.length) errors.push('Options must all be unique.');
  }

  const rawCorrect = item.correctAnswer ?? item.correct_answer;
  const correctAnswer = typeof rawCorrect === 'string' ? rawCorrect.trim() : String(rawCorrect ?? '').trim();
  if (!correctAnswer) {
    errors.push('correctAnswer is missing or empty.');
  } else if (options.length === 4) {
    const match = options.find(opt => opt.trim() === correctAnswer);
    if (!match) errors.push(`correctAnswer "${correctAnswer}" does not match any of the 4 options: [${options.join(', ')}].`);
  }

  const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
  if (!explanation) errors.push('Explanation is missing or empty.');

  const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General';
  let difficulty = typeof item.difficulty === 'string' ? item.difficulty.trim() : 'Easy';
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) difficulty = 'Easy';

  let xp = typeof item.xp === 'number' ? item.xp : parseInt(item.xp, 10);
  if (isNaN(xp) || xp <= 0) xp = 10;

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], quiz: { question, options, correctAnswer, explanation, category, difficulty, xp } };
}

function validateQuizBatch(rawInput) {
  let parsed;
  if (typeof rawInput === 'string') {
    const cleaned = sanitizeJsonInput(rawInput);
    if (!cleaned) return { valid: [], invalid: [{ index: 0, question: 'Input', errors: ['Pasted content is empty.'] }], totalDetected: 0 };
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return { valid: [], invalid: [{ index: 0, question: 'JSON Syntax', errors: [`JSON Parse Error: ${err.message}`] }], totalDetected: 0 };
    }
  } else {
    parsed = rawInput;
  }

  let quizList = [];
  if (Array.isArray(parsed)) quizList = parsed;
  else if (parsed && Array.isArray(parsed.quizzes)) quizList = parsed.quizzes;
  else if (parsed && Array.isArray(parsed.items)) quizList = parsed.items;
  else if (parsed && typeof parsed === 'object') quizList = [parsed];
  else return { valid: [], invalid: [{ index: 0, question: 'Root Format', errors: ['Expected a JSON object with a "quizzes" array'] }], totalDetected: 0 };

  const valid = [];
  const invalid = [];
  const seenQuestions = new Set();

  quizList.forEach((item, index) => {
    const result = validateSingleQuiz(item, seenQuestions);
    const questionLabel = item?.question ? String(item.question).substring(0, 60) : `Quiz #${index + 1}`;
    if (result.valid && result.quiz) valid.push(result.quiz);
    else invalid.push({ index: index + 1, question: questionLabel, errors: result.errors });
  });

  return { valid, invalid, totalDetected: quizList.length };
}

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

console.log('\n--- 1. Markdown Sanitizer ---');
const rawMd = '```json\n{"quizzes":[{"question":"Q","options":["1","2","3","4"],"correctAnswer":"1","explanation":"E","category":"Sci","difficulty":"Easy","xp":10}]}\n```';
assert(sanitizeJsonInput(rawMd).startsWith('{') && sanitizeJsonInput(rawMd).endsWith('}'), 'Strips Markdown fences');

console.log('\n--- 2. Batch Imports (1, 10, 50) ---');
const q1 = { quizzes: [{ question: "Octopus hearts count?", options: ["1", "2", "3", "4"], correctAnswer: "3", explanation: "3 hearts", category: "Science", difficulty: "Easy", xp: 10 }] };
const r1 = validateQuizBatch(JSON.stringify(q1));
assert(r1.valid.length === 1 && r1.invalid.length === 0, '1 valid quiz');

const q10 = { quizzes: Array.from({ length: 10 }, (_, i) => ({ question: `Q#${i+1}?`, options: ["A", "B", "C", "D"], correctAnswer: "A", explanation: "Exp", category: "Science", difficulty: "Medium", xp: 10 })) };
const r10 = validateQuizBatch(JSON.stringify(q10));
assert(r10.valid.length === 10, '10 valid quizzes');

const q50 = { quizzes: Array.from({ length: 50 }, (_, i) => ({ question: `Planetary question #${i+1}?`, options: ["1", "2", "3", "4"], correctAnswer: "2", explanation: "Exp", category: "Space", difficulty: "Easy", xp: 10 })) };
const r50 = validateQuizBatch(JSON.stringify(q50));
assert(r50.valid.length === 50, '50 valid quizzes');

console.log('\n--- 3. Error Detection ---');
assert(validateQuizBatch({ quizzes: [{ question: "", options: ["A","B","C","D"], correctAnswer: "A", explanation: "E" }] }).invalid.length === 1, 'Catches empty question');
assert(validateQuizBatch({ quizzes: [{ question: "Q?", options: ["A","B","C"], correctAnswer: "A", explanation: "E" }] }).invalid.length === 1, 'Catches 3 options');
assert(validateQuizBatch({ quizzes: [{ question: "Q?", options: ["A","A","C","D"], correctAnswer: "A", explanation: "E" }] }).invalid.length === 1, 'Catches duplicate options');
assert(validateQuizBatch({ quizzes: [{ question: "Q?", options: ["A","B","C","D"], correctAnswer: "Z", explanation: "E" }] }).invalid.length === 1, 'Catches answer mismatch');
assert(validateQuizBatch({ quizzes: [{ question: "Same Q?", options: ["A","B","C","D"], correctAnswer: "A", explanation: "E" }, { question: "Same Q?", options: ["A","B","C","D"], correctAnswer: "A", explanation: "E" }] }).invalid.length === 1, 'Catches duplicate questions in batch');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
console.log('🎉 ALL TESTS PASSED!\n');
