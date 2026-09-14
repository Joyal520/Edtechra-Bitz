// ============================================================================
// TEST SUITE: EXAM AI GENERATOR BLUEPRINT SYNCHRONIZATION
// Verifies that the Exam AI Generator strictly follows the builder blueprint
// as the single source of truth across both server and client layers.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  validateExamAgainstBlueprint as serverValidateExamAgainstBlueprint,
  generateBlueprintCorrectionPrompt as serverGenerateCorrectionPrompt,
  normalizeCanonicalQuestionType
} from '../server/ai/outputValidator.mjs';

import {
  buildFallbackExam,
  normalizeExam,
  validateGenerationPayload
} from '../server/exam2Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
const errors = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    errors.push({ name, error: err });
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    errors.push({ name, error: err });
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================================');
console.log('RUNNING EXAM AI GENERATOR BLUEPRINT SYNCHRONIZATION TEST SUITE');
console.log('======================================================================\n');

// ----------------------------------------------------------------------------
// Test Group 1: Canonical Question Type Normalization
// ----------------------------------------------------------------------------
console.log('Group 1: Question Type Normalization');

test('Normalizes various raw types to canonical identifiers', () => {
  assert.strictEqual(normalizeCanonicalQuestionType('Multiple Choice Questions (MCQ)'), 'multiple_choice');
  assert.strictEqual(normalizeCanonicalQuestionType('mcq'), 'multiple_choice');
  assert.strictEqual(normalizeCanonicalQuestionType('True or False Questions'), 'true_false');
  assert.strictEqual(normalizeCanonicalQuestionType('tf'), 'true_false');
  assert.strictEqual(normalizeCanonicalQuestionType('Fill In The Blanks'), 'fill_in_blank');
  assert.strictEqual(normalizeCanonicalQuestionType('fill_blank'), 'fill_in_blank');
  assert.strictEqual(normalizeCanonicalQuestionType('Short Answer Questions'), 'short_answer');
  assert.strictEqual(normalizeCanonicalQuestionType('short_ans'), 'short_answer');
  assert.strictEqual(normalizeCanonicalQuestionType('Reading Comprehension Questions'), 'reading_comprehension');
  assert.strictEqual(normalizeCanonicalQuestionType('reading'), 'reading_comprehension');
  assert.strictEqual(normalizeCanonicalQuestionType('error_correction'), 'error_correction');
  assert.strictEqual(normalizeCanonicalQuestionType('Matching Questions'), 'matching');
  assert.strictEqual(normalizeCanonicalQuestionType('reorder'), 'reorder');
});

// ----------------------------------------------------------------------------
// Test Group 2: Standard Exam Template Blueprint Specification
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
console.log('\nGroup 2: Standard Blueprint Structure (5 types, 41 questions, 100 marks)');

const STANDARD_BLUEPRINT = {
  subject: 'English Language',
  grade: 'Grade 10',
  topic: 'Simple Present Tense',
  examType: 'Standard Exam',
  difficulty: 'Medium',
  duration: '60 Minutes',
  passPercentage: 50,
  totalQuestions: 41,
  totalMarks: 100,
  sections: [
    { type: 'multiple_choice', name: 'Multiple Choice', count: 15, marks: 2 },
    { type: 'true_false', name: 'True / False', count: 5, marks: 2 },
    { type: 'fill_in_blank', name: 'Fill in the Blank', count: 8, marks: 2 },
    { type: 'short_answer', name: 'Short Answer', count: 12, marks: 2 },
    { type: 'reading_comprehension', name: 'Reading Comprehension', count: 1, marks: 20 }
  ]
};

test('Standard blueprint totals exactly 41 questions and 100 marks across 5 types', () => {
  const calculatedQuestions = STANDARD_BLUEPRINT.sections.reduce((sum, s) => sum + s.count, 0);
  const calculatedMarks = STANDARD_BLUEPRINT.sections.reduce((sum, s) => sum + s.count * s.marks, 0);

  assert.strictEqual(calculatedQuestions, 41, 'Standard blueprint question count must be 41');
  assert.strictEqual(calculatedMarks, 100, 'Standard blueprint total marks must be 100');
  assert.strictEqual(STANDARD_BLUEPRINT.sections.length, 5, 'Standard blueprint must have 5 question types');
});

// ----------------------------------------------------------------------------
// Test Group 3: Strict Rejection of MCQ-Only AI Output When Blueprint is Multi-Type
// ----------------------------------------------------------------------------
console.log('\nGroup 3: Strict Rejection of Hardcoded MCQ-Only Responses & Extra Category Discrepancies');

test('Server validator rejects MCQ-only JSON (e.g. 25 MCQs) when blueprint requires 41 multi-type questions', () => {
  // Simulating bug where AI generated 25 MCQs only
  const mcqOnlyExam = {
    metadata: {
      title: 'English Language Assessment',
      examType: 'Standard Exam',
      difficulty: 'Medium',
      totalMarks: 100
    },
    sections: [
      {
        sectionId: 'sec_1',
        title: 'Section A — Multiple Choice Questions',
        questionType: 'multiple_choice',
        questions: Array.from({ length: 25 }, (_, i) => ({
          questionId: `q_${i + 1}`,
          questionType: 'multiple_choice',
          question: `Sample MCQ Question #${i + 1}`,
          options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
          correctAnswer: 'Alpha',
          marks: 4
        }))
      }
    ]
  };

  const validation = serverValidateExamAgainstBlueprint(mcqOnlyExam, STANDARD_BLUEPRINT);
  assert.strictEqual(validation.isValid, false, 'Validation must fail when AI generates only MCQs');
  assert.ok(validation.errors.length > 0, 'Must produce specific validation errors');

  // Verify specific mismatch errors are detected
  const countError = validation.errors.find(e => e.includes('Total question count mismatch'));
  assert.ok(countError, 'Must detect total question count mismatch (found: 25, expected: 41)');

  const missingTf = validation.errors.find(e => e.includes('true_false'));
  assert.ok(missingTf, 'Must detect missing true_false question type');

  const missingFill = validation.errors.find(e => e.includes('fill_in_blank'));
  assert.ok(missingFill, 'Must detect missing fill_in_blank question type');

  const missingShort = validation.errors.find(e => e.includes('short_answer'));
  assert.ok(missingShort, 'Must detect missing short_answer question type');
});

test('Server validator strictly rejects 46 questions, 17 short answers, 110 marks discrepancy (+5 questions bug)', () => {
  // Simulating the bug where 5 extra error correction questions were generated as short answer
  const bugExam = {
    metadata: {
      title: 'Discrepant Exam',
      examType: 'Standard Exam',
      difficulty: 'Medium',
      totalMarks: 110
    },
    sections: [
      {
        sectionId: 'sec_1',
        title: 'MCQ',
        questionType: 'multiple_choice',
        questions: Array.from({ length: 15 }, (_, i) => ({
          questionId: `q1_${i + 1}`,
          questionType: 'multiple_choice',
          question: `MCQ ${i + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          marks: 2
        }))
      },
      {
        sectionId: 'sec_2',
        title: 'True / False',
        questionType: 'true_false',
        questions: Array.from({ length: 5 }, (_, i) => ({
          questionId: `q2_${i + 1}`,
          questionType: 'true_false',
          question: `TF ${i + 1}`,
          correctAnswer: true,
          marks: 2
        }))
      },
      {
        sectionId: 'sec_3',
        title: 'Fill in Blank',
        questionType: 'fill_in_blank',
        questions: Array.from({ length: 8 }, (_, i) => ({
          questionId: `q3_${i + 1}`,
          questionType: 'fill_in_blank',
          question: `Fill [blank] ${i + 1}`,
          acceptedAnswers: ['answer'],
          marks: 2
        }))
      },
      {
        sectionId: 'sec_4',
        title: 'Short Answer (17 questions instead of 12)',
        questionType: 'short_answer',
        questions: Array.from({ length: 17 }, (_, i) => ({
          questionId: `q4_${i + 1}`,
          questionType: 'short_answer',
          question: `Short answer ${i + 1}`,
          correctAnswer: 'Model answer',
          marks: 2
        }))
      },
      {
        sectionId: 'sec_5',
        title: 'Reading Comprehension',
        questionType: 'reading_comprehension',
        questions: [
          {
            questionId: 'q5_1',
            type: 'reading_comprehension',
            passageTitle: 'Reading Passage',
            passage: 'Passage context...',
            question: 'Read and answer',
            marks: 20,
            subQuestions: [
              { id: 'sub1', type: 'multiple_choice', question: 'Sub 1', options: ['A', 'B'], correctAnswer: 'A' },
              { id: 'sub2', type: 'multiple_choice', question: 'Sub 2', options: ['A', 'B'], correctAnswer: 'A' }
            ]
          }
        ]
      }
    ]
  };

  const validation = serverValidateExamAgainstBlueprint(bugExam, STANDARD_BLUEPRINT);
  assert.strictEqual(validation.isValid, false, 'Must reject 46 questions / 110 marks');
  assert.ok(
    validation.errors.some(e => e.includes('Total question count mismatch: expected 41, but generated 46.')),
    'Must report exact question count mismatch: expected 41, but generated 46.'
  );
  assert.ok(
    validation.errors.some(e => e.includes('Question type "short_answer" count mismatch: expected 12, but generated 17.')),
    'Must report exact short_answer count mismatch: expected 12, but generated 17.'
  );
  assert.ok(
    validation.errors.some(e => e.includes('Total marks mismatch: expected 100 marks, but generated 110 marks.')),
    'Must report exact total marks mismatch: expected 100 marks, but generated 110 marks.'
  );
});

// ----------------------------------------------------------------------------
// Test Group 4: Successful Validation When Generated Exam Fully Matches Blueprint
// ----------------------------------------------------------------------------
console.log('\nGroup 4: Successful Validation for Fully Compliant Generated Exam');

test('Server validator passes when generated exam matches all 5 types and 41 questions (100 marks)', () => {
  const compliantSections = STANDARD_BLUEPRINT.sections.map((sec, sIdx) => ({
    sectionId: `sec_${sIdx + 1}`,
    title: `Section ${sIdx + 1} - ${sec.name}`,
    questionType: sec.type,
    passage: sec.type === 'reading_comprehension' ? 'Reading passage text...' : undefined,
    questions: Array.from({ length: sec.count }, (_, qIdx) => {
      const q = {
        questionId: `s${sIdx + 1}_q${qIdx + 1}`,
        questionType: sec.type,
        question: `Question testing ${sec.name} #${qIdx + 1}`,
        marks: sec.marks,
        difficulty: 'medium'
      };

      if (sec.type === 'multiple_choice') {
        q.options = ['Choice A', 'Choice B', 'Choice C', 'Choice D'];
        q.correctAnswer = 'Choice A';
      } else if (sec.type === 'true_false') {
        q.correctAnswer = true;
      } else if (sec.type === 'fill_in_blank') {
        q.question = 'Subject and verb must [blank] in number.';
        q.acceptedAnswers = ['agree', 'match'];
      } else if (sec.type === 'short_answer') {
        q.correctAnswer = 'Correct grammatical response.';
      } else if (sec.type === 'reading_comprehension') {
        q.passageTitle = 'Reading Passage';
        q.passage = 'Passage context text...';
        q.subQuestions = [
          { id: 'sub_1', type: 'multiple_choice', question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
          { id: 'sub_2', type: 'multiple_choice', question: 'Q2', options: ['A', 'B'], correctAnswer: 'A' },
          { id: 'sub_3', type: 'multiple_choice', question: 'Q3', options: ['A', 'B'], correctAnswer: 'A' },
          { id: 'sub_4', type: 'multiple_choice', question: 'Q4', options: ['A', 'B'], correctAnswer: 'A' }
        ];
      }

      return q;
    })
  }));

  const compliantExam = {
    metadata: {
      title: 'Standard Examination',
      examType: 'Standard Exam',
      difficulty: 'Medium',
      totalMarks: 100
    },
    sections: compliantSections
  };

  const validation = serverValidateExamAgainstBlueprint(compliantExam, STANDARD_BLUEPRINT);
  assert.strictEqual(validation.isValid, true, `Compliant exam must pass validation. Errors: ${validation.errors.join(', ')}`);
  assert.strictEqual(validation.diff.actualTotalQuestions, 41);
  assert.strictEqual(validation.diff.actualTotalMarks, 100);
});

// ----------------------------------------------------------------------------
// Test Group 5: Automatic Repair Prompt Construction
// ----------------------------------------------------------------------------
console.log('\nGroup 5: Repair Prompt Construction with Diff Feedback');

test('Correction prompt generates exact discrepancy diff for AI repair loop', () => {
  const errors = [
    'Total question count mismatch: expected 41, but generated 25.',
    'Question type "true_false" count mismatch: expected 5, but generated 0.',
    'Question type "fill_in_blank" count mismatch: expected 8, but generated 0.'
  ];
  const diff = {
    expectedTotalQuestions: 41,
    actualTotalQuestions: 25,
    expectedTotalMarks: 100,
    actualTotalMarks: 100,
    expectedTypeCounts: {
      multiple_choice: 15,
      true_false: 5,
      fill_in_blank: 8,
      short_answer: 12,
      reading_comprehension: 1
    }
  };

  const repairPrompt = serverGenerateCorrectionPrompt(errors, diff, '{"sections":[]}', STANDARD_BLUEPRINT);
  assert.ok(repairPrompt.includes('CRITICAL ARCHITECTURE FIX REQUIRED'), 'Must contain critical fix header');
  assert.ok(repairPrompt.includes('Total question count mismatch: expected 41, but generated 25.'), 'Must cite the count error');
  assert.ok(repairPrompt.includes('true_false: exactly 5 question(s)'), 'Must instruct required true_false count');
  assert.ok(repairPrompt.includes('fill_in_blank: exactly 8 question(s)'), 'Must instruct required fill_in_blank count');
  assert.ok(repairPrompt.includes('short_answer: exactly 12 question(s)'), 'Must instruct required short_answer count');
  assert.ok(repairPrompt.includes('Do NOT simplify this exam to only Multiple Choice questions'), 'Must warn against MCQ-only collapse');
});

// ----------------------------------------------------------------------------
// Test Group 6: Offline & Fallback Engine Strictly Adheres to Blueprint
// ----------------------------------------------------------------------------
console.log('\nGroup 6: Deterministic Fallback Generator Adherence');

test('buildFallbackExam generates all 5 sections and 41 questions matching the blueprint', () => {
  const fallbackExam = buildFallbackExam({
    examType: 'Standard Exam',
    difficulty: 'Medium',
    content: 'Simple Present Tense lesson content',
    sections: STANDARD_BLUEPRINT.sections
  });

  assert.strictEqual(fallbackExam.sections.length, 5, 'Fallback must have 5 sections');
  const totalQuestions = fallbackExam.sections.reduce((sum, s) => sum + s.questions.length, 0);
  assert.strictEqual(totalQuestions, 41, 'Fallback must have exactly 41 questions');

  const validation = serverValidateExamAgainstBlueprint(fallbackExam, STANDARD_BLUEPRINT);
  assert.strictEqual(validation.isValid, true, `Fallback exam must pass blueprint validation: ${validation.errors.join('; ')}`);
});

// ----------------------------------------------------------------------------
// Test Group 7: Metadata Locking
// ----------------------------------------------------------------------------
console.log('\nGroup 7: Authoritative Metadata Locking');

test('normalizeExam locks duration, pass mark, total questions, total marks to blueprint', () => {
  const rawExam = {
    metadata: {
      title: 'Hallucinated Title',
      duration: '10 Minutes', // Incorrectly hallucinated by AI
      passPercentage: 90,     // Incorrectly hallucinated
      totalMarks: 50          // Incorrectly hallucinated
    },
    sections: []
  };

  const payload = {
    title: 'Grade 10 English Standard Exam',
    durationMinutes: 60,
    passPercentage: 50,
    requiredTotal: 100,
    difficulty: 'Medium',
    examType: 'Standard Exam',
    sections: STANDARD_BLUEPRINT.sections
  };

  const normalized = normalizeExam(rawExam, payload, STANDARD_BLUEPRINT);
  assert.strictEqual(normalized.metadata.duration, '60 Minutes', 'Duration must be locked to 60 Minutes');
  assert.strictEqual(normalized.metadata.passPercentage, 50, 'Pass mark must be locked to 50%');
  assert.strictEqual(normalized.metadata.totalMarks, 100, 'Total marks must be locked to 100');
  assert.strictEqual(normalized.metadata.difficulty, 'Medium', 'Difficulty must match blueprint');
});

// ----------------------------------------------------------------------------
// Test Group 8: Wizard AI Prompt Generator Multi-Section Template
// ----------------------------------------------------------------------------
console.log('\nGroup 8: Wizard Prompt Generator Multi-Section Verification');

test('Wizard and PromptBuilder code files contain strict blueprint enforcement rules', () => {
  const wizardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/exam/builder/ai/AIExamGeneratorWizard.tsx'), 'utf8');
  assert.ok(wizardFile.includes('validateExamAgainstBlueprint'), 'Wizard must import and call validateExamAgainstBlueprint');
  assert.ok(wizardFile.includes('REQUIRED SECTIONS & PER-TYPE SCHEMA OUTLINE'), 'Wizard prompt must outline all required sections');
  assert.ok(wizardFile.includes('DO NOT simplify this exam to only Multiple Choice questions'), 'Wizard prompt must explicitly forbid MCQ simplification');

  const promptBuilderFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/exam/teacher/promptBuilder.ts'), 'utf8');
  assert.ok(promptBuilderFile.includes('BLUEPRINT ENFORCEMENT (MANDATORY)'), 'promptBuilder must include mandatory blueprint enforcement rule');
});

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
if (errors.length > 0) {
  console.log(`FAILURES: ${errors.length}`);
  process.exit(1);
} else {
  console.log('ALL EXAM BLUEPRINT AI GENERATOR TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}
