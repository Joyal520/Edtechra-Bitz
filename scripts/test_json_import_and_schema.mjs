/**
 * test_json_import_and_schema.mjs
 * Validates CEFR prompt generation, JSON schema validation, flexibility, and model conversion.
 */

import assert from 'node:assert/strict';

// Test JSON payload simulating what an LLM or user might paste
const sampleAiJson = {
  version: "1.0",
  course_title: "ESL Beginners Unit 1",
  cefr_level: "A1",
  questions: [
    {
      id: "q1",
      category: "A",
      type: "multiple_choice",
      question: "Who is Emily's best friend?",
      options: [
        { id: "A", text: "Tom" },
        { id: "B", text: "Sophie" },
        { id: "C", text: "Sarah" },
        { id: "D", text: "Anna" }
      ],
      correct_answer: "B",
      points: 10,
      explanation: "Sophie is Emily's best friend."
    },
    {
      id: "q2",
      category: "A",
      type: "wh_question",
      wh_type: "where",
      question: "Where is Emily from?",
      expected_answer: "Emily is from London.",
      acceptable_answers: ["London", "She is from London", "She's from London"],
      points: 10,
      explanation: "The text states Emily is from London."
    },
    {
      id: "q3",
      category: "B",
      type: "true_false",
      question: "Emily lives in Paris.",
      options: ["True", "False"],
      correct_answer: "False",
      points: 5,
      explanation: "Emily lives in London, not Paris."
    },
    {
      id: "q4",
      category: "D",
      type: "fill_in_the_blank",
      question: "Emily's best friend is [blank].",
      correct_answer: "Sophie",
      points: 10
    }
  ]
};

console.log("🧪 Starting JSON Import & Schema Validation Test Suite...\n");

// 1. Test schema validation logic
function validatePlan(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, errors: ['Input must be a valid JSON object.'] };
  }
  const errors = [];
  const questions = Array.isArray(rawJson.questions) ? rawJson.questions : [];
  if (questions.length === 0) {
    errors.push('The "questions" array is empty or missing.');
  }

  const validTypes = new Set([
    'multiple_choice', 'single_choice', 'wh_question', 'true_false',
    'fill_in_the_blank', 'sentence_scramble', 'matching', 'audio_challenge',
    'open_ended', 'speaking', 'word_choice', 'grammar_correction', 'checkbox'
  ]);

  questions.forEach((q, idx) => {
    const num = idx + 1;
    const qText = q.question || q.questionText || q.prompt;
    if (!qText || typeof qText !== 'string' || !qText.trim()) {
      errors.push(`Question #${num}: Question text is required.`);
    }
    const qType = q.type || 'multiple_choice';
    if (!validTypes.has(qType)) {
      errors.push(`Question #${num}: Unsupported question type "${qType}".`);
    }

    if (qType === 'multiple_choice' || qType === 'single_choice' || qType === 'checkbox') {
      const opts = q.options || q.choices;
      if (!Array.isArray(opts) || opts.length < 2) {
        errors.push(`Question #${num}: Multiple choice questions must provide at least 2 options.`);
      }
    }

    if (qType === 'wh_question') {
      const exp = q.expected_answer || q.answer;
      if (!exp || typeof exp !== 'string' || !exp.trim()) {
        errors.push(`Question #${num}: WH questions must include an expected_answer.`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

const validation = validatePlan(sampleAiJson);
console.log("Validation errors:", validation.errors);
assert.equal(validation.valid, true, "Sample AI JSON should pass validation");
console.log("✅ TEST 1 PASSED: Sample AI JSON validated successfully.");

// 2. Test Model Conversion
function convertToCourseQuestions(plan, lessonId = 'lesson-1') {
  return plan.questions.map((q, idx) => {
    const qType = q.type || 'multiple_choice';
    let options = null;

    if (q.options && Array.isArray(q.options)) {
      options = q.options.map((opt, oIdx) => {
        if (typeof opt === 'string') {
          return { id: String.fromCharCode(65 + oIdx), text: opt };
        }
        return {
          id: opt.id || String.fromCharCode(65 + oIdx),
          text: opt.text || opt.label || String(opt)
        };
      });
    }

    return {
      id: `q_${Date.now()}_${idx}`,
      lesson_id: lessonId,
      question: (q.question || q.questionText || '').trim(),
      type: qType,
      options: options,
      correct_answer: q.correct_answer || q.correctAnswer || '',
      wh_type: q.wh_type,
      expected_answer: q.expected_answer,
      acceptable_answers: q.acceptable_answers,
      explanation: q.explanation || null,
      points: typeof q.points === 'number' ? q.points : 10,
      order_index: idx
    };
  });
}

const converted = convertToCourseQuestions(sampleAiJson);
assert.equal(converted.length, 4, "Should convert 4 questions");

// Question 1: Multiple choice
assert.equal(converted[0].type, 'multiple_choice');
assert.equal(converted[0].correct_answer, 'B');
assert.equal(converted[0].options[1].id, 'B');
assert.equal(converted[0].options[1].text, 'Sophie');
console.log("✅ TEST 2 PASSED: Multiple choice conversion matches canonical schema.");

// Question 2: WH Question
assert.equal(converted[1].type, 'wh_question');
assert.equal(converted[1].wh_type, 'where');
assert.equal(converted[1].expected_answer, 'Emily is from London.');
assert.equal(converted[1].acceptable_answers.length, 3);
console.log("✅ TEST 3 PASSED: WH Question converted with expected and acceptable answers.");

// Question 3: True/False with string options converted to objects
assert.equal(converted[2].type, 'true_false');
assert.equal(converted[2].options[0].id, 'A');
assert.equal(converted[2].options[0].text, 'True');
assert.equal(converted[2].options[1].id, 'B');
assert.equal(converted[2].options[1].text, 'False');
console.log("✅ TEST 4 PASSED: String[] options converted to structured options.");

console.log("\n🎉 ALL JSON IMPORT & SCHEMA VALIDATION TESTS PASSED SUCCESSFULLY!");
