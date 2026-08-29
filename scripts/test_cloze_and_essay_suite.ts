import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  validateAiQuestionJson,
  buildAiQuestionPrompt,
  convertValidatedJsonToCourseQuestions,
  QuestionPlan
} from '../src/utils/questionSchemaValidator';
import { evaluateStudentEssay } from '../server/courseEssayEvaluationService.mjs';

console.log('\n======================================================');
console.log('🧪 RUNNING CLOZE PASSAGE & ESSAY QUESTION SUITE');
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
  // TEST 1: Cloze Passage JSON Schema Validation (2 Passage Activities)
  // --------------------------------------------------------------------------
  test('TEST 1: Cloze Passage validates 2 passage activities with 4-option blanks', () => {
    const plan: QuestionPlan = {
      items: [
        { id: '1', type: 'cloze_passage', count: 2, difficulty: 'medium' }
      ]
    };

    const json = JSON.stringify({
      schema_version: '1.0',
      lesson: { title: 'Eagle Flight' },
      question_sets: [
        {
          type: 'cloze_passage',
          questions: [
            {
              question: 'Complete the passage using the correct words.',
              passage: 'The young bird looked at the [sky] every morning. He wanted to [fly].',
              blanks: [
                {
                  id: 'blank_1',
                  answer: 'sky',
                  options: ['sky', 'ground', 'farm', 'nest']
                },
                {
                  id: 'blank_2',
                  answer: 'fly',
                  options: ['fly', 'walk', 'sleep', 'run']
                }
              ],
              explanation: 'The bird looked at the sky and wanted to fly.',
              difficulty: 'medium',
              points: 10
            },
            {
              question: 'Complete the second passage.',
              passage: 'One day, he climbed a high [hill] and spread his [wings].',
              blanks: [
                {
                  id: 'blank_1',
                  answer: 'hill',
                  options: ['hill', 'tree', 'river', 'cage']
                },
                {
                  id: 'blank_2',
                  answer: 'wings',
                  options: ['wings', 'beak', 'claws', 'eyes']
                }
              ],
              explanation: 'He climbed the hill to spread his wings.',
              difficulty: 'medium',
              points: 10
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json, plan);
    assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
    assert.strictEqual(res.summary.totalQuestions, 2);
    assert.strictEqual(res.summary.byType.cloze_passage, 2);

    const questions = convertValidatedJsonToCourseQuestions(res.parsedData, 'ep_1', 'course_1');
    assert.strictEqual(questions.length, 2);
    assert.strictEqual(questions[0].question_type, 'cloze_passage');
    assert.strictEqual(questions[0].blanks?.length, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Cloze Passage validation catches invalid blanks (e.g. not 4 options or missing answer)
  // --------------------------------------------------------------------------
  test('TEST 2: Cloze Passage rejects blanks without exactly 4 options or missing correct answer in options', () => {
    const json = JSON.stringify({
      schema_version: '1.0',
      question_sets: [
        {
          type: 'cloze_passage',
          questions: [
            {
              passage: 'The bird flew in the [sky].',
              blanks: [
                {
                  id: 'blank_1',
                  answer: 'sky',
                  options: ['ground', 'farm', 'nest'] // only 3 options
                }
              ]
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('Must contain exactly 4 options')), 'Must reject blank without 4 options');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Essay / Descriptive Response JSON Schema Validation & Conversion
  // --------------------------------------------------------------------------
  test('TEST 3: Essay question validates with image_url, target word range, and evaluation criteria', () => {
    const plan: QuestionPlan = {
      items: [
        { id: '1', type: 'essay', count: 1, difficulty: 'medium', min_words: 80, max_words: 100 }
      ]
    };

    const json = JSON.stringify({
      schema_version: '1.0',
      lesson: { title: 'Visual Description' },
      question_sets: [
        {
          type: 'essay',
          questions: [
            {
              question: 'Describe this image in 80–100 words.',
              image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
              answer_length: {
                min_words: 80,
                max_words: 100
              },
              evaluation_criteria: [
                'content_accuracy',
                'relevance',
                'completeness',
                'language',
                'grammar',
                'vocabulary'
              ],
              explanation: 'Describe the central elements and colors.',
              difficulty: 'medium',
              points: 20
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json, plan);
    assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
    assert.strictEqual(res.summary.totalQuestions, 1);
    assert.strictEqual(res.summary.byType.essay, 1);

    const questions = convertValidatedJsonToCourseQuestions(res.parsedData, 'ep_1', 'course_1');
    assert.strictEqual(questions.length, 1);
    assert.strictEqual(questions[0].question_type, 'essay');
    assert.strictEqual(questions[0].image_url, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80');
    assert.strictEqual(questions[0].min_words, 80);
    assert.strictEqual(questions[0].max_words, 100);
    assert.strictEqual(questions[0].evaluation_criteria?.length, 6);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Dynamic AI Prompt includes Cloze & Essay instructions
  // --------------------------------------------------------------------------
  test('TEST 4: AI Prompt correctly constructs instructions for Cloze & Essay questions', () => {
    const plan: QuestionPlan = {
      items: [
        { id: '1', type: 'cloze_passage', count: 2, difficulty: 'medium' },
        { id: '2', type: 'essay', count: 1, difficulty: 'hard', min_words: 80, max_words: 100 }
      ]
    };

    const prompt = buildAiQuestionPrompt({
      courseTitle: 'Eagle Flight Academy',
      unitTitle: 'Unit 1: The Mountain',
      episodeTitle: 'Lesson 1: First Flight',
      lessonText: 'The young eagle stood upon the jagged precipice, gazing across the morning valley.',
      plan
    });

    assert(prompt.includes('Cloze Passage — 2 passage activities'), 'Prompt must instruct Cloze passage count');
    assert(prompt.includes('Essay / Descriptive Response — 1 question'), 'Prompt must instruct Essay count');
    assert(prompt.includes('"cloze_passage"'), 'JSON template must include cloze_passage');
    assert(prompt.includes('"essay"'), 'JSON template must include essay');
    assert(!prompt.includes('"multiple_choice"'), 'JSON template must NOT include unrequested MCQ');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Essay Evaluation Service (Structured Output & Rubric Scoring)
  // --------------------------------------------------------------------------
  await test('TEST 5: evaluateStudentEssay returns normalized score, strengths, and criteria breakdown', async () => {
    const result = await evaluateStudentEssay({
      question_text: 'Describe this image of a young eagle learning to fly in 80–100 words.',
      student_response: 'In this breathtaking visual, a majestic young eagle prepares for its maiden flight from the mountain peak. The wide landscape below features lush emerald valleys and winding crystal rivers under a bright morning sunrise. The bird displays great determination in its posture and spread wings, symbolizing courage and ambition.',
      min_words: 40,
      max_words: 100,
      evaluation_criteria: ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary']
    });

    assert(typeof result.score === 'number' && result.score >= 0 && result.score <= 100, 'Score must be a number between 0 and 100');
    assert.strictEqual(result.max_score, 100, 'Max score must be 100');
    assert(result.feedback && typeof result.feedback === 'string', 'Must provide written feedback');
    assert(Array.isArray(result.strengths) && result.strengths.length > 0, 'Must provide strengths list');
    assert(Array.isArray(result.improvements) && result.improvements.length > 0, 'Must provide improvements list');
    assert(result.criteria_scores && typeof result.criteria_scores === 'object', 'Must provide criteria breakdown scores');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Multi-Question Plan with Existing Types + Cloze + Essay (Backward Compatibility)
  // --------------------------------------------------------------------------
  test('TEST 6: Mixed Plan with 5 MCQ, 3 TF, 1 Ordering, 1 Cloze, 1 Essay validates idempotently', () => {
    const plan: QuestionPlan = {
      items: [
        { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
        { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
        { id: '3', type: 'ordering', count: 5, difficulty: 'medium' },
        { id: '4', type: 'cloze_passage', count: 1, difficulty: 'medium' },
        { id: '5', type: 'essay', count: 1, difficulty: 'medium' }
      ]
    };

    const json = JSON.stringify({
      schema_version: '1.0',
      lesson: { title: 'Complete Multi-Type Lesson' },
      question_sets: [
        {
          type: 'multiple_choice',
          questions: [1,2,3,4,5].map(i => ({
            question: `MCQ question #${i}`,
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 'A',
            explanation: `Explanation #${i}`,
            difficulty: 'medium',
            points: 10
          }))
        },
        {
          type: 'true_false',
          questions: [1,2,3].map(i => ({
            statement: `Statement #${i}`,
            correct_answer: true,
            explanation: `TF explanation #${i}`,
            difficulty: 'medium',
            points: 10
          }))
        },
        {
          type: 'ordering',
          questions: [
            {
              question: 'Arrange events in chronological order',
              items: ['Event 1', 'Event 2', 'Event 3', 'Event 4', 'Event 5'],
              explanation: 'Story timeline.',
              difficulty: 'medium',
              points: 10
            }
          ]
        },
        {
          type: 'cloze_passage',
          questions: [
            {
              question: 'Complete the passage.',
              passage: 'The bird looked at the [sky].',
              blanks: [{ id: 'b1', answer: 'sky', options: ['sky', 'earth', 'sea', 'fire'] }],
              explanation: 'Passage context.',
              difficulty: 'medium',
              points: 10
            }
          ]
        },
        {
          type: 'essay',
          questions: [
            {
              question: 'Describe what you learned in 80–100 words.',
              answer_length: { min_words: 80, max_words: 100 },
              evaluation_criteria: ['content_accuracy', 'relevance'],
              explanation: 'Reflective writing.',
              difficulty: 'medium',
              points: 20
            }
          ]
        }
      ]
    });

    const res = validateAiQuestionJson(json, plan);
    assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join(', ')}`);
    // Total: 5 MCQ + 3 TF + 1 Ordering (5 items) + 1 Cloze + 1 Essay = 11 activities
    assert.strictEqual(res.summary.totalQuestions, 11);
  });

  // --------------------------------------------------------------------------
  // TEST 7: UI Component Codebase Audit (ClozePassageQuestion & EssayQuestion exist)
  // --------------------------------------------------------------------------
  test('TEST 7: ClozePassageQuestion and EssayQuestion components are exported and integrated', () => {
    const clozeSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/course-studio/ClozePassageQuestion.tsx'), 'utf8');
    assert(clozeSrc.includes('renderPassageWithBlanks'), 'ClozePassageQuestion must implement passage parsing');
    assert(clozeSrc.includes('handleSelectOption'), 'ClozePassageQuestion must handle option selection and locking');
    assert(clozeSrc.includes('playCorrectSound'), 'ClozePassageQuestion must trigger sound feedback');

    const essaySrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/course-studio/EssayQuestion.tsx'), 'utf8');
    assert(essaySrc.includes('evaluateEssay'), 'EssayQuestion must call AI essay evaluation service');
    assert(essaySrc.includes('wordCount'), 'EssayQuestion must track live word count');
    assert(essaySrc.includes('dark:bg-[#182232] dark:text-white'), 'EssayQuestion must maintain dark mode contrast');

    const rendererSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx'), 'utf8');
    assert(rendererSrc.includes('ClozePassageQuestion'), 'CourseContentRenderer must mount ClozePassageQuestion');
    assert(rendererSrc.includes('EssayQuestion'), 'CourseContentRenderer must mount EssayQuestion');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Migration & Server Endpoint Audit
  // --------------------------------------------------------------------------
  test('TEST 8: Migration and server endpoint POST /api/course-studio/essay-evaluate are registered', () => {
    const migrationSrc = fs.readFileSync(
      path.join(ROOT_DIR, 'supabase/migrations/20260829194500_course_questions_add_cloze_and_essay.sql'),
      'utf8'
    );
    assert(migrationSrc.includes('cloze_passage') && migrationSrc.includes('essay'), 'Migration must include new question types');

    const serverSrc = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');
    assert(serverSrc.includes('/api/course-studio/essay-evaluate'), 'server.mjs must register essay-evaluate endpoint');
    assert(serverSrc.includes('evaluateStudentEssay'), 'server.mjs must call evaluateStudentEssay');
  });

  console.log('\n======================================================');
  console.log(`🎯 CLOZE & ESSAY SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests();
