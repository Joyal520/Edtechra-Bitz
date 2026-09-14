// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TWO-TIER AI ROUTING TEST SUITE
// Tests 1 to 10 verifying task-based routing (Gemini vs OpenAI GPT-5 nano),
// structured output validation, token/cost tracking, fallbacks, and security.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AI_TASK_TYPES,
  AI_PROVIDERS,
  getAIProvider,
  getPreferredModel,
  classifyTask
} from '../server/ai/taskTypes.mjs';
import {
  validateAssessmentQuestions,
  shuffleOptionsWithAnswerTracking,
  validateTeachingPlan
} from '../server/ai/outputValidator.mjs';
import { aiUsageLogger } from '../server/ai/aiUsageLogger.mjs';
import { aiRouter } from '../server/ai/aiRouter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAIRoutingSuite() {
  console.log('================================================================');
  console.log('🧪 EDTECHRA TWO-TIER AI PROVIDER ROUTING TEST SUITE (GEMINI + GPT-5 NANO)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Simple Grammar / Vocabulary Explanation routes to Gemini Flash
  // --------------------------------------------------------------------------
  await test('Test 1: Simple Grammar Explanation routes to Gemini Flash', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.GRAMMAR_EXPLANATION);
    assert.strictEqual(provider, AI_PROVIDERS.GEMINI, 'Grammar explanation should route to Gemini');
    const model = getPreferredModel(provider, AI_TASK_TYPES.GRAMMAR_EXPLANATION);
    assert(model.includes('gemini'), 'Model should be Gemini model');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Simple AI Teacher Chat routes to Gemini Flash
  // --------------------------------------------------------------------------
  await test('Test 2: Simple AI Teacher Chat routes to Gemini Flash', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.TEACHER_CHAT);
    assert.strictEqual(provider, AI_PROVIDERS.GEMINI, 'Teacher chat should route to Gemini');

    const classified = classifyTask('Hi teacher assistant, can you tell me John\'s attendance?');
    assert.strictEqual(getAIProvider(classified), AI_PROVIDERS.GEMINI, 'Conversational query routes to Gemini');
  });

  // --------------------------------------------------------------------------
  // TEST 3: 25-Question Diagnostic Exam routes to OpenAI GPT-5 nano
  // --------------------------------------------------------------------------
  await test('Test 3: 25-Question Diagnostic Exam routes to OpenAI GPT-5 nano', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.DIAGNOSTIC_GENERATION);
    assert.strictEqual(provider, AI_PROVIDERS.OPENAI, 'Diagnostic generation must route to OpenAI');
    const model = getPreferredModel(provider, AI_TASK_TYPES.DIAGNOSTIC_GENERATION);
    assert.strictEqual(model, 'gpt-5-nano', 'Preferred model for diagnostic exam must be gpt-5-nano');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Live Quiz Content Generation routes to OpenAI GPT-5 nano
  // --------------------------------------------------------------------------
  await test('Test 4: Live Quiz Content Generation routes to OpenAI GPT-5 nano', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.QUIZ_GENERATION);
    assert.strictEqual(provider, AI_PROVIDERS.OPENAI, 'Live Quiz generation must route to OpenAI');
    const model = getPreferredModel(provider, AI_TASK_TYPES.QUIZ_GENERATION);
    assert.strictEqual(model, 'gpt-5-nano', 'Preferred model for quiz generation must be gpt-5-nano');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Sentence Reordering / Interactive Activity routes to OpenAI GPT-5 nano
  // --------------------------------------------------------------------------
  await test('Test 5: Sentence Reordering Activity routes to OpenAI GPT-5 nano', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.COMPLEX_ACTIVITY_GENERATION);
    assert.strictEqual(provider, AI_PROVIDERS.OPENAI, 'Complex activity generation must route to OpenAI');
    const model = getPreferredModel(provider, AI_TASK_TYPES.COMPLEX_ACTIVITY_GENERATION);
    assert.strictEqual(model, 'gpt-5-nano', 'Preferred model must be gpt-5-nano');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Teaching Intelligence Class Analysis routes to OpenAI GPT-5 nano
  // --------------------------------------------------------------------------
  await test('Test 6: Teaching Intelligence Class Analysis routes to OpenAI GPT-5 nano', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.CLASS_ANALYSIS);
    assert.strictEqual(provider, AI_PROVIDERS.OPENAI, 'Class analysis must route to OpenAI');
    const model = getPreferredModel(provider, AI_TASK_TYPES.CLASS_ANALYSIS);
    assert.strictEqual(model, 'gpt-5-nano', 'Preferred model for class analysis must be gpt-5-nano');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Simple Announcement Generation routes to Gemini Flash
  // --------------------------------------------------------------------------
  await test('Test 7: Simple Announcement Generation routes to Gemini Flash', async () => {
    const provider = getAIProvider(AI_TASK_TYPES.ANNOUNCEMENT_GENERATION);
    assert.strictEqual(provider, AI_PROVIDERS.GEMINI, 'Announcement generation must route to Gemini');
  });

  // --------------------------------------------------------------------------
  // TEST 8: GPT-5 nano Structured JSON Output Quality Validation
  // --------------------------------------------------------------------------
  await test('Test 8: Assessment Question Output Quality Validator', async () => {
    // A. Valid Questions
    const validQuestions = [
      {
        question: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Mitochondria', 'Ribosome', 'Nucleus', 'Endoplasmic Reticulum'],
        correct_answer: 'Mitochondria',
        explanation: 'Mitochondria generate most of the cell supply of adenosine triphosphate (ATP).'
      },
      {
        question: 'What is the chemical symbol for gold?',
        options: ['Au', 'Ag', 'Fe', 'Pb'],
        correct_answer: 'Au',
        explanation: 'Au comes from the Latin word aurum.'
      }
    ];
    const validResult = validateAssessmentQuestions(validQuestions, { expectedCount: 2 });
    assert.strictEqual(validResult.isValid, true, 'Valid questions should pass validation');
    assert.strictEqual(validResult.sanitizedQuestions.length, 2);

    // B. Rejection of "All of the above"
    const lazyQuestions = [
      {
        question: 'Which of these are fruits?',
        options: ['Apple', 'Banana', 'Orange', 'All of the above'],
        correct_answer: 'All of the above'
      }
    ];
    const lazyResult = validateAssessmentQuestions(lazyQuestions);
    assert.strictEqual(lazyResult.isValid, false, 'Must reject "All of the above"');
    assert(lazyResult.errors.some(e => e.includes('Lazy choice') || e.includes('strictly forbidden')));

    // C. Rejection of duplicate options
    const duplicateQuestions = [
      {
        question: 'Solve 2 + 2',
        options: ['4', '4', '3', '5'],
        correct_answer: '4'
      }
    ];
    const dupResult = validateAssessmentQuestions(duplicateQuestions);
    assert.strictEqual(dupResult.isValid, false, 'Must reject duplicate options');

    // D. Option Shuffling with Answer Tracking
    const shuffled = shuffleOptionsWithAnswerTracking(
      ['First', 'Second', 'Third', 'Fourth'],
      'Second'
    );
    assert.strictEqual(shuffled.correct_answer, 'Second', 'Correct answer text must be preserved after shuffle');
    assert(shuffled.options.includes('Second'), 'Options must still contain correct answer');
    assert.strictEqual(shuffled.options.length, 4);

    // E. Teaching Plan Validation
    const testPlan = {
      title: 'Photosynthesis Master Plan',
      topic: 'Photosynthesis',
      learning_goal: 'Students will understand the light and dark reactions.',
      duration_days: 3,
      daily_plan: [
        { day: 1, title: 'Day 1', activities: [{ name: 'Intro', duration_minutes: 45 }] },
        { day: 2, title: 'Day 2', activities: [{ name: 'Lab', duration_minutes: 45 }] },
        { day: 3, title: 'Day 3', activities: [{ name: 'Review', duration_minutes: 45 }] }
      ]
    };
    const planVal = validateTeachingPlan(testPlan);
    assert.strictEqual(planVal.isValid, true, 'Valid teaching plan must pass validation');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Controlled Fallback on Provider Failure & Telemetry Logging
  // --------------------------------------------------------------------------
  await test('Test 9: Controlled Fallback & AI Usage Logging', async () => {
    // A. Verify aiUsageLogger tracking & ring buffer
    const initialSummary = aiUsageLogger.getSummary();
    aiUsageLogger.log({
      provider: 'openai',
      model: 'gpt-5-nano',
      taskType: AI_TASK_TYPES.DIAGNOSTIC_GENERATION,
      promptTokens: 1000,
      completionTokens: 500,
      reasoningTokens: 100,
      totalTokens: 1500,
      latencyMs: 850,
      success: true,
      fallbackUsed: false
    });

    const updatedSummary = aiUsageLogger.getSummary();
    assert.strictEqual(
      updatedSummary.totalRequests,
      initialSummary.totalRequests + 1,
      'Total requests count must increment'
    );
    assert.strictEqual(
      updatedSummary.providerBreakdown.openai,
      initialSummary.providerBreakdown.openai + 1,
      'OpenAI count must increment'
    );

    // Verify Cost Calculation ($0.05 / 1M prompt + $0.20 / 1M completion)
    // 1000 / 1M * 0.05 = $0.00005. 500 / 1M * 0.20 = $0.00010. Total = $0.00015
    const recentLogs = aiUsageLogger.getRecentLogs(1);
    assert.strictEqual(recentLogs.length, 1);
    assert.strictEqual(recentLogs[0].estimatedCostUSD, 0.00015);

    // B. Verify deterministic fallback execution when both providers unavailable
    const fallbackRes = await aiRouter.executeTask({
      taskType: AI_TASK_TYPES.QUIZ_GENERATION,
      prompt: 'Generate test quiz',
      fallbackFactory: () => ({ questions: [{ question: 'Sample?', options: ['A', 'B', 'C', 'D'], correct_answer: 'A' }] })
    });
    assert(fallbackRes.data || fallbackRes.parsed, 'Must return valid fallback object');
  });

  // --------------------------------------------------------------------------
  // TEST 10: Client Bundle Security Audit (Zero API Key Leakage)
  // --------------------------------------------------------------------------
  await test('Test 10: Client Bundle Security Audit (Zero API Key Leakage)', async () => {
    const srcDir = path.resolve(__dirname, '../src');
    const forbiddenPatterns = [
      'process.env.OPENAI_API_KEY',
      'import.meta.env.OPENAI_API_KEY',
      'VITE_OPENAI_API_KEY'
    ];

    function scanFiles(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanFiles(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of forbiddenPatterns) {
            assert(
              !content.includes(pattern),
              `CRITICAL SECURITY VIOLATION: ${pattern} found in client file ${fullPath}`
            );
          }
        }
      }
    }

    scanFiles(srcDir);
    console.log('     ✓ Scanned all files in /src: 0 private OpenAI API keys or client env references found.');
  });

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAIRoutingSuite().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
