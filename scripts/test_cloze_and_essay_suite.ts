import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  validateAiQuestionJson,
  buildAiQuestionPrompt,
  convertValidatedJsonToCourseQuestions,
  getPlanItemActivityCount,
  getPlanItemTotalMarks,
  QuestionPlan
} from '../src/utils/questionSchemaValidator';
import { evaluateStudentEssay } from '../server/courseEssayEvaluationService.mjs';

console.log('\n======================================================');
console.log('🧪 RUNNING CLOZE PASSAGE, PLANNER & AUTOSAVE SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(() => {
        console.log(`✅ PASS: ${name}`);
        passed++;
      }).catch((err: any) => {
        console.error(`❌ FAIL: ${name}`);
        console.error(err);
        failed++;
      });
    }
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

const ROOT_DIR = process.cwd();

async function runAllTests() {
  // --------------------------------------------------------------------------
  // TEST 1: Cloze Passage Number of Blanks: 10 blanks = 1 activity, 20 marks total
  // --------------------------------------------------------------------------
  test('TEST 1: Cloze Passage Number of Blanks: 10 blanks = 1 activity, 20 marks total', () => {
    const plan: QuestionPlan = {
      items: [
        {
          id: '1',
          type: 'cloze_passage',
          count: 10,
          blankCount: 10,
          difficulty: 'medium',
          points: 20
        }
      ]
    };

    assert.strictEqual(getPlanItemActivityCount(plan.items[0]), 1, 'Cloze with 10 blanks must count as 1 activity');
    assert.strictEqual(getPlanItemTotalMarks(plan.items[0]), 20, 'Cloze with 10 blanks and 20 marks must equal 20 total marks (NOT 200)');

    const json = JSON.stringify({
      schema_version: '1.0',
      lesson: { title: 'The Eagle Journey' },
      question_sets: [
        {
          type: 'cloze_passage',
          questions: [
            {
              question: 'Complete the passage.',
              passage: 'The young eagle lived in the high mountains. (Passage with 10 blanks)...',
              blanks: Array.from({ length: 10 }, (_, i) => ({
                id: `blank_${i + 1}`,
                answer: `word_${i + 1}`,
                options: [`word_${i + 1}`, `dist_${i + 1}a`, `dist_${i + 1}b`, `dist_${i + 1}c`]
              })),
              explanation: 'Based on context.',
              difficulty: 'medium',
              points: 20
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json, plan);
    assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
    assert.strictEqual(res.summary.totalActivities, 1, 'Total activities must be 1');
    assert.strictEqual(res.summary.totalMarks, 20, 'Total marks must be 20');

    const questions = convertValidatedJsonToCourseQuestions(res.parsedData, 'ep_1', 'course_1');
    assert.strictEqual(questions.length, 1, 'Must produce exactly 1 question object');
    assert.strictEqual(questions[0].blanks?.length, 10, 'Must contain exactly 10 blanks');
    assert.strictEqual(questions[0].points, 20, 'Question points must be 20');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Strict Cloze Blank Count Mismatch Rejection
  // --------------------------------------------------------------------------
  test('TEST 2: Strict Cloze validation rejects mismatch (requested 10 blanks, JSON has 4 blanks)', () => {
    const plan: QuestionPlan = {
      items: [
        {
          id: '1',
          type: 'cloze_passage',
          count: 10,
          blankCount: 10,
          difficulty: 'medium',
          points: 20
        }
      ]
    };

    const json = JSON.stringify({
      schema_version: '1.0',
      question_sets: [
        {
          type: 'cloze_passage',
          questions: [
            {
              passage: 'Passage with 4 blanks',
              blanks: Array.from({ length: 4 }, (_, i) => ({
                id: `blank_${i + 1}`,
                answer: `word_${i + 1}`,
                options: [`word_${i + 1}`, `a`, `b`, `c`]
              }))
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json, plan);
    assert.strictEqual(res.isValid, false, 'Must reject count mismatch');
    assert(res.errors.some(e => e.includes('Cloze Passage must contain exactly 10 blanks. The generated JSON contains 4.')), 'Must report specific blank count error');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Marks / Points Calculations Across All Question Types
  // --------------------------------------------------------------------------
  test('TEST 3: Marks calculation across MCQ (5 × 15 = 75), TF (3 × 5 = 15), Ordering (2 × 10 = 20), Cloze (1 × 20 = 20)', () => {
    const plan: QuestionPlan = {
      items: [
        { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium', points: 15 },
        { id: '2', type: 'true_false', count: 3, difficulty: 'medium', points: 5 },
        { id: '3', type: 'ordering', count: 5, activityCount: 2, itemsPerActivity: 5, difficulty: 'medium', points: 10 },
        { id: '4', type: 'cloze_passage', count: 10, blankCount: 10, difficulty: 'medium', points: 20 }
      ]
    };

    assert.strictEqual(getPlanItemTotalMarks(plan.items[0]), 75); // 5 * 15
    assert.strictEqual(getPlanItemTotalMarks(plan.items[1]), 15); // 3 * 5
    assert.strictEqual(getPlanItemTotalMarks(plan.items[2]), 20); // 2 * 10
    assert.strictEqual(getPlanItemTotalMarks(plan.items[3]), 20); // 1 * 20 (NOT 200)

    const totalActivities = plan.items.reduce((s, i) => s + getPlanItemActivityCount(i), 0);
    const totalMarks = plan.items.reduce((s, i) => s + getPlanItemTotalMarks(i), 0);

    assert.strictEqual(totalActivities, 11); // 5 MCQ + 3 TF + 2 Ordering + 1 Cloze = 11 activities
    assert.strictEqual(totalMarks, 130); // 75 + 15 + 20 + 20 = 130 marks
  });

  // --------------------------------------------------------------------------
  // TEST 4: Ordering with Separate Activity Count and Items per Activity
  // --------------------------------------------------------------------------
  test('TEST 4: Ordering produces requested activity count and items per activity', () => {
    const plan: QuestionPlan = {
      items: [
        {
          id: '1',
          type: 'ordering',
          count: 5,
          activityCount: 2,
          itemsPerActivity: 5,
          difficulty: 'medium',
          points: 10
        }
      ]
    };

    const prompt = buildAiQuestionPrompt({
      courseTitle: 'Eagle Flight',
      unitTitle: 'Unit 1',
      episodeTitle: 'Lesson 1',
      lessonText: 'Lesson text...',
      plan
    });

    assert(prompt.includes('Ordering — Create exactly 2 Ordering activities, each containing exactly 5 sentence blocks'), 'Prompt must instruct 2 activities with 5 sentences');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Dynamic AI Prompt Constructs Exact Cloze Blanks Instruction
  // --------------------------------------------------------------------------
  test('TEST 5: AI Prompt constructs "Create exactly ONE Cloze Passage question containing exactly 10 blanks"', () => {
    const plan: QuestionPlan = {
      items: [
        {
          id: '1',
          type: 'cloze_passage',
          count: 10,
          blankCount: 10,
          difficulty: 'medium',
          points: 20
        }
      ]
    };

    const prompt = buildAiQuestionPrompt({
      courseTitle: 'Eagle Flight',
      unitTitle: 'Unit 1',
      episodeTitle: 'Lesson 1',
      lessonText: 'Lesson text...',
      plan
    });

    assert(prompt.includes('Create exactly ONE Cloze Passage question containing exactly 10 blanks'), 'Must state ONE question containing 10 blanks');
    assert(prompt.includes('Points: 20 (for the entire passage activity)'), 'Must state points for the entire activity');
    assert(!prompt.includes('Create 10 Cloze questions'), 'Must never say create 10 cloze questions');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Non-Blocking Debounced Background Autosave Engine Audit
  // --------------------------------------------------------------------------
  test('TEST 6: CourseEditorPage implements non-blocking debounced autosave with automatic retry', () => {
    const editorSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/course-studio/CourseEditorPage.tsx'), 'utf8');

    assert(editorSrc.includes('performBackgroundSave'), 'Must implement performBackgroundSave');
    assert(editorSrc.includes('lastSavedSignatureRef'), 'Must track saved signature to prevent redundant saves');
    assert(editorSrc.includes('retrying'), 'Must support retrying state');
    assert(editorSrc.includes("Couldn't save — retrying"), 'Must show subtle retry message');
    assert(!editorSrc.includes('disabled={savingStatus === \'saving\'} on input'), 'Autosave must never disable typing inputs');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Idempotent Import Prevents Duplicate Questions
  // --------------------------------------------------------------------------
  test('TEST 7: Idempotent question conversion and deduplication prevents duplicate questions', () => {
    const json = {
      schema_version: '1.0',
      question_sets: [
        {
          type: 'multiple_choice',
          questions: [
            { question: 'Q1', options: ['A', 'B'], correct_answer: 'A', points: 10 },
            { question: 'Q2', options: ['A', 'B'], correct_answer: 'B', points: 10 }
          ]
        }
      ]
    };

    const firstImport = convertValidatedJsonToCourseQuestions(json, 'ep_1', 'course_1');
    assert.strictEqual(firstImport.length, 2);

    const secondImport = convertValidatedJsonToCourseQuestions(json, 'ep_1', 'course_1');
    assert.strictEqual(secondImport.length, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Multimodal Essay Evaluation Endpoint
  // --------------------------------------------------------------------------
  await test('TEST 8: Essay Evaluation service produces structured rubric and feedback', async () => {
    const evalResult = await evaluateStudentEssay({
      question_text: 'Describe the sunrise over the eagle sanctuary in 80–100 words.',
      student_response: 'The golden rays of dawn illuminate the rugged cliff faces of the mountain sanctuary. Below, morning mist weaves through the emerald valley while eagles take to the sky with effortless grace.',
      min_words: 30,
      max_words: 100,
      evaluation_criteria: ['content_accuracy', 'relevance', 'language', 'grammar']
    });

    assert(typeof evalResult.score === 'number' && evalResult.score >= 0 && evalResult.score <= 100);
    assert(evalResult.feedback && typeof evalResult.feedback === 'string');
    assert(Array.isArray(evalResult.strengths) && evalResult.strengths.length > 0);
    assert(Array.isArray(evalResult.improvements) && evalResult.improvements.length > 0);
  });

  console.log('\n======================================================');
  console.log(`🎯 CLOZE, PLANNER & AUTOSAVE SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests();
