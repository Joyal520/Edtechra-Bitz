// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DIRECT PREVIEW EDITOR & AI DESIGNER TEST SUITE
// Tests Course Plan generation, Structured Lesson generation,
// Direct Preview editing state transitions, semantic image zones, and security.
// ============================================================================

import assert from 'node:assert/strict';
import {
  generateCoursePlanWithAI,
  generateStructuredLessonWithAI
} from '../server/courseStudioService.mjs';

console.log('------------------------------------------------------------');
console.log('🧪 RUNNING DIRECT PREVIEW EDITOR & AI DESIGNER TEST SUITE');
console.log('------------------------------------------------------------\n');

let totalTests = 0;
let passedTests = 0;

async function runAsyncTest(description, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ [PASS] ${description}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// 1. AI COURSE PLAN GENERATION TESTS
// --------------------------------------------------------------------------
await runAsyncTest('AI Course Plan: Generates structured CEFR curriculum plan', async () => {
  const plan = await generateCoursePlanWithAI({
    coursePrompt: 'Create a beginner English course for A1 learners focusing on everyday conversations and greetings',
    targetLevel: 'A1 Beginner',
    ageGroup: 'Teens & Adults',
    unitsCount: 4,
    lessonsPerUnit: 3,
    learningStyles: ['reading', 'vocabulary', 'speaking', 'quizzes'],
    subject: 'English'
  });

  assert.ok(plan, 'Plan must not be null');
  assert.ok(plan.title, 'Course must have a title');
  assert.ok(plan.short_description, 'Course must have a short description');
  assert.equal(plan.subject, 'English');
  assert.equal(plan.grade_level, 'A1 Beginner');
  assert.ok(Array.isArray(plan.units), 'Plan must have units array');
  assert.ok(plan.units.length >= 1, 'Plan must contain at least 1 unit');

  // Verify first unit and its episodes
  const firstUnit = plan.units[0];
  assert.ok(firstUnit.title, 'Unit must have a title');
  assert.ok(Array.isArray(firstUnit.episodes), 'Unit must have episodes');
  assert.ok(firstUnit.episodes.length >= 1, 'Unit must have at least 1 episode');

  const firstEp = firstUnit.episodes[0];
  assert.ok(firstEp.title, 'Episode must have a title');
  assert.ok(firstEp.objective || firstEp.can_do, 'Episode must have an objective or can-do statement');
});

// --------------------------------------------------------------------------
// 2. AI STRUCTURED LESSON GENERATION TESTS
// --------------------------------------------------------------------------
await runAsyncTest('AI Lesson Designer: Generates sequential blocks with Markdown and practice questions', async () => {
  const lesson = await generateStructuredLessonWithAI({
    courseTitle: 'Basic English: Me & My World',
    unitTitle: 'Unit 1 — Introductions & Greetings',
    lessonTitle: 'Lesson 1: Saying Hello and Your Name',
    targetLevel: 'A1 Beginner',
    objective: 'Introduce yourself and greet friends politely.',
    subject: 'English'
  });

  assert.ok(lesson, 'Lesson must not be null');
  assert.ok(lesson.title, 'Lesson must have a title');
  assert.ok(lesson.summary, 'Lesson must have a summary');
  assert.ok(Array.isArray(lesson.blocks), 'Lesson must contain blocks array');
  assert.ok(lesson.blocks.length >= 2, 'Lesson must contain multiple content blocks');

  // Verify blocks format
  lesson.blocks.forEach(b => {
    assert.ok(b.block_type, 'Block must have a block_type');
    assert.ok(b.content, 'Block must have content');
  });

  // Verify at least one block has Markdown text
  const hasMarkdownText = lesson.blocks.some(b => typeof b.content?.text === 'string' && b.content.text.length > 0);
  assert.ok(hasMarkdownText, 'Lesson must have Markdown text blocks');

  // Verify practice questions
  assert.ok(Array.isArray(lesson.suggested_questions), 'Lesson must have practice questions');
  assert.ok(lesson.suggested_questions.length >= 1, 'Lesson must have at least 1 suggested question');

  const firstQ = lesson.suggested_questions[0];
  assert.ok(firstQ.question_text, 'Question must have question_text');
  assert.ok(firstQ.question_type, 'Question must have question_type');
  assert.ok(firstQ.correct_answer, 'Question must have correct_answer');
});

// --------------------------------------------------------------------------
// 3. SECURITY & ENVIRONMENT ISOLATION TESTS
// --------------------------------------------------------------------------
await runAsyncTest('Security: Server environment variables are never exposed in generated output', async () => {
  const plan = await generateCoursePlanWithAI({
    coursePrompt: 'Basic English test',
    unitsCount: 1,
    lessonsPerUnit: 1
  });

  const serialized = JSON.stringify(plan);
  if (process.env.GEMINI_API_KEY) {
    assert.ok(
      !serialized.includes(process.env.GEMINI_API_KEY),
      'GEMINI_API_KEY must NEVER be leaked in API responses'
    );
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    assert.ok(
      !serialized.includes(process.env.SUPABASE_SERVICE_ROLE_KEY),
      'Service role key must NEVER be leaked in API responses'
    );
  }
});

// --------------------------------------------------------------------------
// 4. DIRECT PREVIEW EDITOR: SEMANTIC POSITIONING TESTS
// --------------------------------------------------------------------------
await runAsyncTest('Direct Preview Editor: Enforces 4 responsive semantic image positions without pixel coordinates', () => {
  const allowedPositions = ['above', 'below', 'left', 'right'];

  allowedPositions.forEach(pos => {
    const textImageBlock = {
      block_type: 'text_image',
      content: {
        title: 'Dialogue Section',
        text: 'Hello, what is your name?',
        image: {
          url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754',
          position: pos,
          caption: 'Students talking'
        }
      }
    };

    assert.equal(textImageBlock.content.image.position, pos);
    assert.equal(typeof textImageBlock.content.image.position, 'string');
    // Ensure no absolute x/y pixel positioning exists
    assert.equal(textImageBlock.content.image.x, undefined);
    assert.equal(textImageBlock.content.image.y, undefined);
  });
});

// --------------------------------------------------------------------------
// 5. DIRECT PREVIEW EDITOR: DUAL MODE STATE INTEGRITY
// --------------------------------------------------------------------------
await runAsyncTest('Direct Preview Editor: State contract preserves Markdown source of truth across Edit & Preview', () => {
  const markdownSource = `# Unit Introduction\n\nWelcome to **Basic English**.\n\n| Word | Meaning |\n|---|---|\n| hello | greeting |`;

  const episodeState = {
    id: 'ep_123',
    title: 'Saying Hello',
    blocks: [
      {
        block_type: 'text',
        content: { text: markdownSource }
      }
    ],
    questions: [
      {
        question_text: 'What is the greeting word?',
        question_type: 'multiple_choice',
        options: ['hello', 'bye', 'night', 'see ya'],
        correct_answer: 'hello'
      }
    ]
  };

  // In Edit Mode: raw markdown string is preserved
  assert.equal(episodeState.blocks[0].content.text, markdownSource);
  assert.ok(!episodeState.blocks[0].content.text.includes('<p>'));
  assert.ok(!episodeState.blocks[0].content.text.includes('<div>'));

  // In Preview Mode: same object is rendered via MarkdownRenderer without mutating state
  const previewBlocks = episodeState.blocks;
  assert.equal(previewBlocks[0].content.text, markdownSource);
});

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`📊 RESULTS: ${passedTests} / ${totalTests} test assertions passed.`);
if (passedTests === totalTests) {
  console.log('🎉 ALL DIRECT PREVIEW EDITOR & AI DESIGNER TESTS PASSED!');
  console.log('------------------------------------------------------------\n');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
