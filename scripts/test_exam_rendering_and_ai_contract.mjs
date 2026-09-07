// ============================================================================
// EDTECHRA ASSESSMENT SYSTEM: EXAM RENDERING & AI JSON CONTRACT VERIFICATION
// Tests the 14 problems resolved:
// - Dynamic 27 navigable questions / 45 marks calculation
// - Cloze passage inline dropdowns with Word Bank (Question 26)
// - Writing task with live word count (Question 27)
// - MCQ 2x2 grid for short options (<40 chars), single-column for long
// - True/False compact horizontal control (48-56px)
// - Short answer dynamic scaling (120-160px vs 180-240px)
// - Text formatting (b, strong, i, em, u) & elimination of literal [blank]
// - Student Preview vs Teacher Edit complete answer key separation
// - AI prompt instructions for A/B/C/D distribution, renderable contracts
// ============================================================================

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=================================================================');
console.log('  EDTECHRA EXAM RENDERING & AI CONTRACT VERIFICATION SUITE       ');
console.log('=================================================================\n');

// -----------------------------------------------------------------------------
// 1. Dynamic Question Counts & Marks (Problem 8 & Problem 9)
// -----------------------------------------------------------------------------
console.log('--- 1. Question Counts & Marks Dynamic Math Verification ---');
const scoringUtilsPath = path.resolve('src/components/exam/shared/scoringUtilities.ts');
assert(fs.existsSync(scoringUtilsPath), 'scoringUtilities.ts exists');
const scoringContent = fs.readFileSync(scoringUtilsPath, 'utf8');

assert(
  scoringContent.includes('export function calculateExamTotalMarks(sections: ExamSection[]): number {') &&
  scoringContent.includes('const flat = flattenExamQuestions(sections);') &&
  scoringContent.includes('flat.reduce((sum, item) => sum + calculateQuestionMarks(item.question), 0);'),
  'calculateExamTotalMarks dynamically sums marks across flattened questions'
);

assert(
  scoringContent.includes('export function calculateTotalQuestionCount(sections: ExamSection[]): number {') &&
  scoringContent.includes('return flattenExamQuestions(sections).length;'),
  'calculateTotalQuestionCount strictly equals flattenExamQuestions(sections).length'
);

// Simulate the exact 27 questions / 45 marks test case
const mockExamSections = [
  {
    id: 'sec_1',
    title: 'Section A — Core Assessment',
    questions: [
      // 10 MCQs (1 mark each)
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `mcq_${i + 1}`,
        type: 'multiple_choice',
        question: `MCQ Question ${i + 1}`,
        marks: 1,
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
          { id: 'c', text: 'Option C' },
          { id: 'd', text: 'Option D' }
        ],
        correctAnswer: ['a']
      })),
      // 5 True/False (1 mark each)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `tf_${i + 1}`,
        type: 'true_false',
        question: `True or False statement ${i + 1}`,
        marks: 1,
        correctAnswer: true
      })),
      // 5 Fill in Blank (1 mark each)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `fib_${i + 1}`,
        type: 'fill_in_blank',
        question: `Sentence with [blank] number ${i + 1}`,
        marks: 1,
        correctAnswer: 'answer'
      })),
      // 5 Short Answer (2 marks each)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `sa_${i + 1}`,
        type: 'short_answer',
        question: `Short answer question ${i + 1}`,
        marks: 2
      }))
    ],
    activities: [
      // 1 Cloze Activity (5 blanks, 5 marks)
      {
        id: 'act_cloze',
        title: 'Cloze Activity',
        activityType: 'cloze_activity',
        marks: 5,
        passage: 'My name is Amal. [blank_1] am a student. [blank_2] studies with me.',
        blanks: [
          { id: 'blank_1', correctAnswer: 'I', acceptedAnswers: ['I'] },
          { id: 'blank_2', correctAnswer: 'She', acceptedAnswers: ['She'] },
          { id: 'blank_3', correctAnswer: 'They', acceptedAnswers: ['They'] },
          { id: 'blank_4', correctAnswer: 'We', acceptedAnswers: ['We'] },
          { id: 'blank_5', correctAnswer: 'He', acceptedAnswers: ['He'] }
        ],
        wordBank: ['I', 'She', 'They', 'We', 'He']
      },
      // 1 Writing Activity (10 marks)
      {
        id: 'act_writing',
        title: 'Writing Activity',
        activityType: 'picture_description_activity',
        marks: 10,
        instructions: 'Write 60-80 words describing the picture.',
        rubric: { content: 4, vocabulary: 3, grammar: 3 }
      }
    ]
  }
];

// Let's implement lightweight inline simulation of flattenExamQuestions
function simulateFlatten(sections) {
  const result = [];
  sections.forEach((sec) => {
    (sec.questions || []).forEach((q) => {
      result.push({ question: q, sectionId: sec.id });
    });
    (sec.activities || []).forEach((act) => {
      if (act.activityType === 'picture_description_activity') {
        result.push({
          question: { id: `${act.id}_write`, type: 'paragraph', marks: act.marks || 10 },
          sectionId: sec.id
        });
      } else if (act.activityType === 'cloze_activity') {
        result.push({
          question: { id: `${act.id}_cloze`, type: 'cloze_passage', marks: act.marks || 5 },
          sectionId: sec.id
        });
      }
    });
  });
  return result;
}

const simulatedFlat = simulateFlatten(mockExamSections);
assert(simulatedFlat.length === 27, `Simulated exam produces exactly 27 questions (got ${simulatedFlat.length})`);
assert(simulatedFlat[25].question.type === 'cloze_passage', 'Question 26 (index 25) is Cloze Passage');
assert(simulatedFlat[26].question.type === 'paragraph', 'Question 27 (index 26) is Writing Task');

const totalMarksSimulated = simulatedFlat.reduce((acc, q) => acc + (q.question.marks || 1), 0);
assert(totalMarksSimulated === 45, `Simulated total marks equals exactly 45 (got ${totalMarksSimulated})`);

// -----------------------------------------------------------------------------
// 2. Safe Rich Text Formatting & Placeholder Replacement (Problem 2 & Problem 6)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Formatted Text & Placeholder Safety Verification ---');
const formattedTextPath = path.resolve('src/components/exam/shared/formattedText.tsx');
assert(fs.existsSync(formattedTextPath), 'formattedText.tsx utility exists');
const formattedContent = fs.readFileSync(formattedTextPath, 'utf8');

assert(formattedContent.includes('hasBlankPlaceholder'), 'Exports hasBlankPlaceholder helper');
assert(formattedContent.includes('renderFormattedPrompt'), 'Exports renderFormattedPrompt helper');
assert(formattedContent.includes('<b>') && formattedContent.includes('<strong>'), 'Supports bold tags (b, strong)');
assert(formattedContent.includes('<i>') && formattedContent.includes('<em>'), 'Supports italic tags (i, em)');
assert(formattedContent.includes('<u>'), 'Supports underline tag (u)');
assert(formattedContent.includes('isFillBlank && onInlineInputChange'), 'Embeds inline input for Fill in the Blank');
assert(formattedContent.includes('border-b-2'), 'Renders typographic underline placeholder instead of literal [blank]');

// -----------------------------------------------------------------------------
// 3. Compact MCQ Design with 2x2 Grid & Shuffling Safety (Problem 3 & Problem 13)
// -----------------------------------------------------------------------------
console.log('\n--- 3. MCQ 2x2 Grid & Option Compactness Verification ---');
const mcqPath = path.resolve('src/components/exam/student/renderers/MCQQuestion.tsx');
assert(fs.existsSync(mcqPath), 'MCQQuestion.tsx exists');
const mcqContent = fs.readFileSync(mcqPath, 'utf8');

assert(mcqContent.includes('isShortOptions'), 'Determines if options are short (<40 chars)');
assert(mcqContent.includes('grid-cols-1 sm:grid-cols-2'), 'Uses 2-column grid on desktop/tablet for short options');
assert(mcqContent.includes('min-h-[48px]'), 'Uses compact auto-height min-h-[48px]');
assert(mcqContent.includes('showAnswerKey = false'), 'Default showAnswerKey is false in student taking mode');
assert(!mcqContent.includes('correctAnswer === opt.id && isSelected'), 'Does not leak correctAnswer when unselected');

// -----------------------------------------------------------------------------
// 4. Compact True/False Horizontal Control (Problem 4)
// -----------------------------------------------------------------------------
console.log('\n--- 4. True/False Compact Horizontal Control Verification ---');
const tfPath = path.resolve('src/components/exam/student/renderers/TrueFalseQuestion.tsx');
assert(fs.existsSync(tfPath), 'TrueFalseQuestion.tsx exists');
const tfContent = fs.readFileSync(tfPath, 'utf8');

assert(tfContent.includes('h-12 sm:h-13'), 'Buttons use compact 48-52px height');
assert(tfContent.includes('flex flex-col sm:flex-row'), 'Side-by-side on desktop, compact on mobile');
assert(!tfContent.includes('p-6 sm:p-7 rounded-3xl'), 'Removed giant cards from True/False');
assert(tfContent.includes('TRUE') && tfContent.includes('FALSE'), 'Renders clear TRUE and FALSE controls');

// -----------------------------------------------------------------------------
// 5. Fill in the Blank Placeholder & Inline Input (Problem 2)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Fill in the Blank Placeholder Handling Verification ---');
const fibPath = path.resolve('src/components/exam/student/renderers/FillBlankQuestion.tsx');
assert(fs.existsSync(fibPath), 'FillBlankQuestion.tsx exists');
const fibContent = fs.readFileSync(fibPath, 'utf8');

assert(fibContent.includes('hasBlankPlaceholder'), 'Uses hasBlankPlaceholder to detect [blank] or ___');
assert(fibContent.includes('renderFormattedPrompt'), 'Renders prompt with embedded inline input if placeholder found');
assert(fibContent.includes('h-11 sm:h-12'), 'Uses standard focused input height (44-48px)');

// -----------------------------------------------------------------------------
// 6. Dynamic Short Answer Textarea (Problem 5)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Short Answer Dynamic Height Scaling Verification ---');
const saPath = path.resolve('src/components/exam/student/renderers/ShortAnswerQuestion.tsx');
assert(fs.existsSync(saPath), 'ShortAnswerQuestion.tsx exists');
const saContent = fs.readFileSync(saPath, 'utf8');

assert(saContent.includes('isCompact'), 'Computes isCompact for 1-2 mark answers');
assert(saContent.includes('min-h-[120px] max-h-[160px]'), 'Uses 120-160px height for 1-2 mark questions');
assert(saContent.includes('min-h-[180px] max-h-[240px]'), 'Uses 180-240px height for 3+ mark questions');

// -----------------------------------------------------------------------------
// 7. Inline Cloze Passage with Embedded Dropdowns (Problem 7)
// -----------------------------------------------------------------------------
console.log('\n--- 7. Inline Cloze Passage with Embedded Dropdowns Verification ---');
const clozeRendererPath = path.resolve('src/components/exam/student/renderers/ClozeQuestion.tsx');
assert(fs.existsSync(clozeRendererPath), 'ClozeQuestion.tsx exists');
const clozeContent = fs.readFileSync(clozeRendererPath, 'utf8');

assert(clozeContent.includes('<select'), 'Uses <select> dropdowns for cloze blanks');
assert(clozeContent.includes('\[ Select ▼ \]'), 'Dropdown has initial unselected placeholder "[ Select ▼ ]"');
assert(clozeContent.includes('wordBank'), 'Supports Word Bank options');
assert(clozeContent.includes('Word Bank'), 'Renders compact Word Bank chip strip above passage');
assert(!clozeContent.includes('Complete Answers:'), 'Removed separate input fields below passage');
assert(clozeContent.includes('leading-[2.2]'), 'Comfortable line-height for inline select controls');

// -----------------------------------------------------------------------------
// 8. LivePreviewModal Dual-Mode Separation & Visual Polish (Problems 1, 10, 14)
// -----------------------------------------------------------------------------
console.log('\n--- 8. LivePreviewModal Dual-Mode & Zero Key Exposure Verification ---');
const previewPath = path.resolve('src/components/exam/builder/preview/LivePreviewModal.tsx');
assert(fs.existsSync(previewPath), 'LivePreviewModal.tsx exists');
const previewContent = fs.readFileSync(previewPath, 'utf8');

assert(
  previewContent.includes("const effectiveShowKeys = viewMode === 'teacher' && showAnswerKeys;"),
  'effectiveShowKeys is strictly disabled in student preview mode'
);
assert(
  previewContent.includes("if (viewMode === 'student')") && previewContent.includes('setShowAnswerKeys(false);'),
  'Automatically resets answer keys to false when student preview is activated'
);
assert(
  previewContent.includes("viewMode === 'teacher' &&") && previewContent.includes('Reveal Keys'),
  'Reveal Keys toggle button is only rendered in Teacher Edit mode'
);
assert(
  previewContent.includes('renderFormattedPrompt('),
  'LivePreviewModal uses renderFormattedPrompt for question text'
);
assert(
  previewContent.includes('<MCQQuestion') &&
  previewContent.includes('<TrueFalseQuestionComponent') &&
  previewContent.includes('<FillBlankQuestionComponent') &&
  previewContent.includes('<ClozeQuestionComponent') &&
  previewContent.includes('<ShortAnswerQuestionComponent') &&
  previewContent.includes('<EssayQuestionComponent'),
  'LivePreviewModal delegates to modular student renderers for consistent UI'
);
assert(
  previewContent.includes('totalMarks') && previewContent.includes('totalQuestions'),
  'Header displays dynamic totalQuestions and totalMarks'
);

// -----------------------------------------------------------------------------
// 9. AI Prompt Strict Grounding, Distribution & Renderability (Problems 11 & 12)
// -----------------------------------------------------------------------------
console.log('\n--- 9. AI Prompt Strict Grounding & Distribution Verification ---');
const wizardPath = path.resolve('src/components/exam/builder/ai/AIExamGeneratorWizard.tsx');
assert(fs.existsSync(wizardPath), 'AIExamGeneratorWizard.tsx exists');
const wizardContent = fs.readFileSync(wizardPath, 'utf8');

assert(
  wizardContent.includes('Generate questions that are directly renderable by the EdTechra examination engine.'),
  'AI Prompt requires questions directly renderable by EdTechra engine'
);
assert(
  wizardContent.includes('Distribute correct answers across A, B, C, and D naturally.'),
  'AI Prompt mandates natural distribution across A, B, C, and D'
);
assert(
  wizardContent.includes('Never refer to an underlined, bold, highlighted, italicized, circled, boxed, or marked word unless that formatting actually exists in the JSON'),
  'AI Prompt prohibits referring to non-existent underline/formatting'
);
assert(
  wizardContent.includes('Do not output literal [blank] text for a question type that does not support blanks.'),
  'AI Prompt prohibits literal [blank] in unsupported question types'
);
assert(
  wizardContent.includes('For Cloze Passage questions, use [blank_1], [blank_2], [blank_3], etc.'),
  'AI Prompt specifies exact [blank_1], [blank_2] Cloze syntax'
);
assert(
  wizardContent.includes('Correct answers are metadata for grading only, stored exclusively in the \'correctAnswer\' field.'),
  'AI Prompt clarifies that correctAnswer is grading metadata only'
);

// -----------------------------------------------------------------------------
// 10. QuestionNavigator Object and Cloze Answer Support (Problem 7 & 8)
// -----------------------------------------------------------------------------
console.log('\n--- 10. QuestionNavigator Cloze & Object Answers Verification ---');
const navPath = path.resolve('src/components/exam/student/QuestionNavigator.tsx');
assert(fs.existsSync(navPath), 'QuestionNavigator.tsx exists');
const navContent = fs.readFileSync(navPath, 'utf8');

assert(
  navContent.includes('isQuestionAnswered') &&
  navContent.includes('typeof ans === \'object\''),
  'QuestionNavigator handles object-based answers for Cloze questions'
);

console.log('\n=================================================================');
console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
console.log('=================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
