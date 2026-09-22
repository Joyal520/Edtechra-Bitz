import { normalizeConcept, CANONICAL_CONCEPTS, extractStructuredErrorsFromEvent, sanitizeConceptInput } from './server/conceptNormalization.mjs';
import { computeTopicAnalytics, computeStudentAnalytics, extractConceptHierarchy } from './server/classroomAnalyticsService.mjs';

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING EVIDENCE-BASED TEACHING INTELLIGENCE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Canonical Concept Normalization & Deduplication
  console.log('--- TEST 1: Concept Normalization & Deduplication ---');
  const t1_a = normalizeConcept("Simple Present negative");
  assert(t1_a?.displayName === 'Simple Present — Negative Forms', `normalize "Simple Present negative" -> ${t1_a?.displayName}`);

  const t1_b = normalizeConcept("Don't / doesn't rules in present tense");
  assert(t1_b?.displayName === 'Simple Present — Negative Forms', `normalize "Don't / doesn't rules" -> ${t1_b?.displayName}`);

  const t1_c = normalizeConcept("Time prepositions at / in / on");
  assert(t1_c?.displayName === 'Prepositions — at / in / on', `normalize "Time prepositions at / in / on" -> ${t1_c?.displayName}`);

  const t1_d = normalizeConcept("Subject-Verb Concord");
  assert(t1_d?.displayName === 'Subject–Verb Agreement', `normalize "Subject-Verb Concord" -> ${t1_d?.displayName}`);

  const t1_e = normalizeConcept("Spelling mistakes");
  assert(t1_e?.displayName === 'Spelling — Common Word Errors', `normalize "Spelling mistakes" -> ${t1_e?.displayName}`);

  // TEST 2: Rejection of Raw JSON, Session IDs, and Trivia Quizzes
  console.log('\n--- TEST 2: Rejection of Raw JSON and General Trivia ---');
  const rawQuizString = 'The general knowledge 1 The general knowledge 1 Grammar {"final_rank":2,"session_id":"7c896a5c","wrong_count":10}';
  const cleanSanitized = sanitizeConceptInput(rawQuizString);
  assert(!cleanSanitized.includes('final_rank') && !cleanSanitized.includes('{'), `Sanitizer strips JSON metadata: "${cleanSanitized}"`);

  const t2_norm = normalizeConcept(rawQuizString);
  assert(t2_norm === null, `Raw JSON/trivia quiz correctly rejected from becoming a concept: ${t2_norm}`);

  const triviaOnly = normalizeConcept('The general knowledge 1');
  assert(triviaOnly === null, `General knowledge quiz rejected from curriculum concept: ${triviaOnly}`);

  const bareGrammar = normalizeConcept('Grammar');
  assert(bareGrammar === null, `Bare category "Grammar" without skill is rejected: ${bareGrammar}`);

  // TEST 3: Structured Error Extraction from OCR & Writing
  console.log('\n--- TEST 3: Structured Error Extraction ---');
  const mockOcrEvent = {
    activity_type: 'ocr',
    topic: 'Handwritten Worksheet',
    metadata: {
      detected_errors: [
        { concept: 'Simple Present — Negative Forms', error_type: 'grammar', student_error: "He don't like football", correct_form: "He doesn't like football" },
        { concept: 'Spelling', error_type: 'spelling', student_error: "becouse", correct_form: "because" }
      ]
    }
  };
  const extractedErrors = extractStructuredErrorsFromEvent(mockOcrEvent);
  assert(extractedErrors.length === 2, `Extracted 2 errors from OCR metadata`);
  assert(extractedErrors[0].student_error === "He don't like football", `Captured student_error: "${extractedErrors[0].student_error}"`);
  assert(extractedErrors[0].correct_form === "He doesn't like football", `Captured correct_form: "${extractedErrors[0].correct_form}"`);
  assert(extractedErrors[1].student_error === "becouse", `Captured spelling error: "${extractedErrors[1].student_error}"`);

  // TEST 4: Multi-Source Evidence Synthesis & Hierarchy Extraction
  console.log('\n--- TEST 4: Multi-Source Evidence Synthesis ---');
  const mockMultiSourceEvents = [
    // OCR Event on Simple Present Negative (Score 40%)
    {
      id: 'e1',
      student_id: 's_ivy',
      activity_id: 'act_ocr_1',
      activity_type: 'ocr',
      activity_title: 'Worksheet 3: Present Negatives',
      topic: 'Simple Present negative',
      percentage: 40,
      completed_at: new Date().toISOString(),
      metadata: {
        detected_errors: [
          { concept: 'Simple Present Negative', student_error: "He don't like tea", correct_form: "He doesn't like tea" }
        ]
      }
    },
    // Live Quiz on Simple Present Negative (Score 50%)
    {
      id: 'e2',
      student_id: 's_alex',
      activity_id: 'act_quiz_1',
      activity_type: 'live_quiz',
      activity_title: 'Live Quiz: Don\'t vs Doesn\'t',
      topic: 'Don\'t / Doesn\'t Forms',
      percentage: 50,
      completed_at: new Date().toISOString(),
      metadata: {
        session_id: 'abc-123',
        final_rank: 1
      }
    },
    // Raw Trivia Quiz (Should be excluded from curriculum concepts)
    {
      id: 'e_trivia',
      student_id: 's_alex',
      activity_id: 'act_trivia_1',
      activity_type: 'live_quiz',
      activity_title: 'The general knowledge 1',
      topic: 'The general knowledge 1',
      percentage: 20,
      completed_at: new Date().toISOString(),
      metadata: {
        session_id: 'trivia-123',
        final_rank: 5
      }
    },
    // Exam on Prepositions (Score 90%)
    {
      id: 'e3',
      student_id: 's_ivy',
      activity_id: 'act_exam_1',
      activity_type: 'exam',
      activity_title: 'Midterm Assessment',
      topic: 'Prepositions at / in / on',
      percentage: 90,
      completed_at: new Date().toISOString(),
      metadata: {}
    }
  ];

  const topicAnalytics = computeTopicAnalytics(mockMultiSourceEvents, { totalStudents: 2 });
  
  // Both Simple Present events should have merged into ONE topic group!
  const presentNegativeGroup = topicAnalytics.find(t => t.displayName === 'Simple Present — Negative Forms');
  assert(presentNegativeGroup != null, 'Grouped into canonical concept "Simple Present — Negative Forms"');
  assert(presentNegativeGroup?.eventCount === 2, `Merged 2 events from OCR and Live Quiz (found ${presentNegativeGroup?.eventCount})`);
  assert(presentNegativeGroup?.sourcesCount === 2, `Identified 2 distinct evidence sources (found ${presentNegativeGroup?.sourcesCount})`);
  assert(presentNegativeGroup?.confidence === 'Confirmed gap', `Assigned confidence "Confirmed gap" due to multi-source failure (found "${presentNegativeGroup?.confidence}")`);
  assert(presentNegativeGroup?.commonErrors?.length > 0, `Contains structured common errors (found ${presentNegativeGroup?.commonErrors?.length})`);
  assert(presentNegativeGroup?.teachAction?.length > 10, `Contains actionable teachAction ("${presentNegativeGroup?.teachAction?.slice(0, 40)}...")`);

  // Verify trivia quiz did NOT leak as a concept
  const triviaLeaked = topicAnalytics.some(t => t.displayName.includes('final_rank') || t.displayName.includes('session_id') || t.displayName.includes('general knowledge'));
  assert(!triviaLeaked, 'No raw JSON or trivia quiz leaked into topic analytics concepts');

  // Prepositions should be recognized as a strength
  const prepGroup = topicAnalytics.find(t => t.displayName === 'Prepositions — at / in / on');
  assert(prepGroup != null, 'Grouped prepositions into canonical concept');
  assert(prepGroup?.averagePercentage === 90, `Prepositions average percentage is 90%`);

  console.log('\n====================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
