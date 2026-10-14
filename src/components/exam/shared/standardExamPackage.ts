// ============================================================================
// EDTECHRA STANDARD EXAM 2.0: CORE BLUEPRINT, PROMPT BUILDER & VALIDATOR
// Controlled 100-mark assessment system:
// Exactly 7 sections, 40 questions, 100 marks.
// Strict progressive difficulty:
// A. MCQ (10 x 2m = 20m)
// B. Matching (5 x 2m = 10m)
// C. Correct or Wrong (5 x 2m = 10m)
// D. Cloze Passage (5 x 2m = 10m)
// E. Find the Mistake (5 x 3m = 15m)
// F. Controlled Type the Answer (5 x 3m = 15m)
// G. Reorder the Sentence (5 x 4m = 20m)
// ============================================================================

import {
  CanonicalAssessmentV2,
  ExamSection,
  CanonicalQuestion,
  MultipleChoiceQuestion
} from './ExamSchema';

export interface StandardExamPromptInput {
  subject?: string;
  topic?: string;
  grade?: string;
  medium?: string;
  difficulty?: string;
  durationMinutes?: number;
  learningObjectives?: string;
  sourceContent?: string;
}

export interface StandardValidationError {
  id: string;
  sectionId?: string;
  questionId?: string;
  message: string;
}

export interface StandardValidationResult {
  isValid: boolean;
  errors: StandardValidationError[];
  warnings: string[];
  stats?: {
    totalQuestions: number;
    totalMarks: number;
    sectionsCount: number;
  };
  canonicalAssessment?: CanonicalAssessmentV2;
}

/**
 * Expected 7 Sections in strict order
 */
export const EXPECTED_STANDARD_SECTIONS = [
  {
    id: 'mcq',
    sectionCode: 'Section A',
    title: 'Multiple Choice Questions',
    questionCount: 10,
    marksPerQuestion: 2,
    totalMarks: 20
  },
  {
    id: 'matching',
    sectionCode: 'Section B',
    title: 'Matching',
    questionCount: 5,
    marksPerQuestion: 2,
    totalMarks: 10
  },
  {
    id: 'correct_wrong',
    sectionCode: 'Section C',
    title: 'Correct or Wrong',
    questionCount: 5,
    marksPerQuestion: 2,
    totalMarks: 10
  },
  {
    id: 'cloze',
    sectionCode: 'Section D',
    title: 'Cloze Passage',
    questionCount: 5,
    marksPerQuestion: 2,
    totalMarks: 10
  },
  {
    id: 'find_mistake',
    sectionCode: 'Section E',
    title: 'Find the Mistake',
    questionCount: 5,
    marksPerQuestion: 3,
    totalMarks: 15
  },
  {
    id: 'controlled_answer',
    sectionCode: 'Section F',
    title: 'Type the Answer',
    questionCount: 5,
    marksPerQuestion: 3,
    totalMarks: 15
  },
  {
    id: 'reorder',
    sectionCode: 'Section G',
    title: 'Reorder the Sentence',
    questionCount: 5,
    marksPerQuestion: 4,
    totalMarks: 20
  }
];

/**
 * Generates the production AI Prompt for external LLMs (ChatGPT / Claude / Gemini)
 */
export function buildStandardExamAIPrompt(input: StandardExamPromptInput): string {
  const {
    subject = 'English Language',
    topic = 'The Simple Past',
    grade = 'Grade 10',
    medium = 'English',
    difficulty = 'Medium',
    durationMinutes = 60,
    learningObjectives = '',
    sourceContent = ''
  } = input;

  return `Create a ${grade} ${subject} Standard Examination on "${topic}".

Use exactly the EdTechra Standard Exam Blueprint.

Return ONLY valid JSON. No conversational prose, no markdown fences, no explanatory text.

The examination must contain exactly 7 sections in this strict order:
1. Section A — Multiple Choice Questions: 10 questions × 2 marks = 20 marks
2. Section B — Matching: 5 questions × 2 marks = 10 marks
3. Section C — Correct or Wrong: 5 questions × 2 marks = 10 marks
4. Section D — Cloze Passage: 5 questions × 2 marks = 10 marks
5. Section E — Find the Mistake: 5 questions × 3 marks = 15 marks
6. Section F — Controlled Type the Answer: 5 questions × 3 marks = 15 marks
7. Section G — Reorder the Sentence: 5 questions × 4 marks = 20 marks

TOTAL: EXACTLY 40 questions / 100 marks.
Duration: ${durationMinutes} minutes. Difficulty: ${difficulty}. Medium of Instruction: ${medium}.
${learningObjectives ? `Learning Objectives:\n${learningObjectives}\n` : ''}
${sourceContent ? `Curriculum Source Content:\n"""\n${sourceContent}\n"""\n` : ''}

================================================================================
STRICT SECTION RULES & REQUIREMENTS
================================================================================

1. SECTION A — MCQ (10 questions × 2 marks = 20 marks)
- Exactly 10 questions.
- Each question must have 2 marks.
- Exactly 4 options per question.
- Exactly 1 unambiguous correct answer.
- Distractors must be grammatically plausible.

2. SECTION B — MATCHING (5 questions × 2 marks = 10 marks)
- Exactly 5 matching questions.
- Each question must have 2 marks.
- Each question must have a clearly defined "left" item and clearly defined "right" matching answer.
- E.g. { "id": "m1", "type": "matching", "left": "buy", "right": "bought", "marks": 2 }

3. SECTION C — CORRECT OR WRONG (5 questions × 2 marks = 10 marks)
- Exactly 5 questions.
- Each question must have 2 marks.
- Each statement must have exactly one logical status: "CORRECT" or "WRONG".
- No debatable or ambiguous statements.
- E.g. { "id": "cw1", "type": "correct_wrong", "statement": "She went to school yesterday.", "correctAnswer": "CORRECT", "marks": 2 }

4. SECTION D — CLOZE PASSAGE WITH DROPDOWN OPTIONS (5 questions × 2 marks = 10 marks)
- Exactly 5 questions.
- Use ONE coherent short passage (80–130 words).
- The passage must contain 5 blanks marked [blank_1], [blank_2], [blank_3], [blank_4], [blank_5].
- Each blank has a dropdown with 4 plausible options (1 correct answer + 3 distractors).
- The blank must be objectively answerable from grammar/context.

5. SECTION E — FIND THE MISTAKE (5 questions × 3 marks = 15 marks)
- VERY IMPORTANT: Each question must contain EXACTLY ONE intentional error. Never two or more.
- Each question must provide:
  * "sentence": The full sentence containing the single error.
  * "tokens": Array of individual words in the sentence.
  * "incorrectToken": The exact incorrect word token (e.g. "go").
  * "tokenIndex": 0-indexed position of that token in the sentence.
  * "correction": The correct grammatical form (e.g. "went").
  * "marks": 3
- Mobile interaction is token-based: student taps the incorrect word.

6. SECTION F — CONTROLLED TYPE THE ANSWER (5 questions × 3 marks = 15 marks)
- This question type MUST NOT be open-ended.
- Every question must have ONE clearly controlled answer testing the target skill.
  Good: "Yesterday, Sarah ______ to school. (go)" -> Expected: "went".
- Each question must include "answer" and "acceptedAnswers" array with legitimate variants:
  { "id": "ca1", "type": "controlled_answer", "question": "Yesterday, Sarah ______ to school. (go)", "answer": "went", "acceptedAnswers": ["went"], "marks": 3 }

7. SECTION G — REORDER THE SENTENCE (5 questions × 4 marks = 20 marks)
- Exactly 5 questions × 4 marks each.
- One clearly defined correct sentence.
- Provide "words" (scrambled array of word tokens) and "correctOrder" (array of tokens in exact correct order).
- No punctuation ambiguity.
  E.g. { "id": "ro1", "type": "reorder", "question": "Arrange the words into a correct sentence:", "words": ["yesterday.", "went", "school", "She", "to"], "correctOrder": ["She", "went", "to", "school", "yesterday."], "marks": 4 }

================================================================================
STRICT JSON OUTPUT SCHEMA
================================================================================
Return ONLY valid JSON with this exact structure:

{
  "exam": {
    "title": "${topic}",
    "subject": "${subject}",
    "grade": "${grade}",
    "durationMinutes": ${durationMinutes},
    "totalMarks": 100,
    "passPercentage": 50
  },
  "sections": [
    {
      "id": "mcq",
      "title": "Multiple Choice Questions",
      "questionCount": 10,
      "marksPerQuestion": 2,
      "totalMarks": 20,
      "questions": [
        {
          "id": "mcq_1",
          "type": "mcq",
          "question": "Which sentence is in the simple past tense?",
          "options": ["She visited Paris.", "She visits Paris.", "She is visiting Paris.", "She will visit Paris."],
          "correctAnswer": "She visited Paris.",
          "marks": 2,
          "explanation": "..."
        }
      ]
    },
    {
      "id": "matching",
      "title": "Matching",
      "questionCount": 5,
      "marksPerQuestion": 2,
      "totalMarks": 10,
      "questions": [
        {
          "id": "match_1",
          "type": "matching",
          "left": "drink",
          "right": "drank",
          "marks": 2
        }
      ]
    },
    {
      "id": "correct_wrong",
      "title": "Correct or Wrong",
      "questionCount": 5,
      "marksPerQuestion": 2,
      "totalMarks": 10,
      "questions": [
        {
          "id": "cw_1",
          "type": "correct_wrong",
          "statement": "She went to school yesterday.",
          "correctAnswer": "CORRECT",
          "marks": 2,
          "explanation": "..."
        }
      ]
    },
    {
      "id": "cloze",
      "title": "Cloze Passage",
      "questionCount": 5,
      "marksPerQuestion": 2,
      "totalMarks": 10,
      "passage": "Yesterday, John [blank_1] to school. He [blank_2] football after class. Later, they [blank_3] lunch together. Sarah [blank_4] an interesting book. Finally, everyone [blank_5] home happily.",
      "questions": [
        {
          "id": "cloze_1",
          "type": "cloze",
          "blankId": "blank_1",
          "blankIndex": 1,
          "options": ["went", "go", "goes", "going"],
          "correctAnswer": "went",
          "marks": 2
        }
      ]
    },
    {
      "id": "find_mistake",
      "title": "Find the Mistake",
      "questionCount": 5,
      "marksPerQuestion": 3,
      "totalMarks": 15,
      "questions": [
        {
          "id": "fm_1",
          "type": "find_mistake",
          "sentence": "She go to school yesterday.",
          "tokens": ["She", "go", "to", "school", "yesterday."],
          "incorrectToken": "go",
          "tokenIndex": 1,
          "correction": "went",
          "marks": 3,
          "explanation": "..."
        }
      ]
    },
    {
      "id": "controlled_answer",
      "title": "Type the Answer",
      "questionCount": 5,
      "marksPerQuestion": 3,
      "totalMarks": 15,
      "questions": [
        {
          "id": "ca_1",
          "type": "controlled_answer",
          "question": "Yesterday, Sarah ______ to school. (go)",
          "answer": "went",
          "acceptedAnswers": ["went"],
          "marks": 3,
          "explanation": "..."
        }
      ]
    },
    {
      "id": "reorder",
      "title": "Reorder the Sentence",
      "questionCount": 5,
      "marksPerQuestion": 4,
      "totalMarks": 20,
      "questions": [
        {
          "id": "ro_1",
          "type": "reorder",
          "question": "Arrange the words into a correct sentence:",
          "words": ["yesterday.", "went", "school", "She", "to"],
          "correctOrder": ["She", "went", "to", "school", "yesterday."],
          "marks": 4,
          "explanation": "..."
        }
      ]
    }
  ]
}

SELF-VALIDATION PASS:
Before returning, verify:
- Exactly 7 sections in order (mcq, matching, correct_wrong, cloze, find_mistake, controlled_answer, reorder).
- Total questions = 40 (10 + 5 + 5 + 5 + 5 + 5 + 5).
- Total marks = 100 (20 + 10 + 10 + 10 + 15 + 15 + 20).
- Valid JSON only.`;
}

/**
 * Validates a Standard Exam package strictly against the 18 criteria.
 */
export function validateStandardExamPackage(rawInput: any): StandardValidationResult {
  const errors: StandardValidationError[] = [];
  const warnings: string[] = [];

  let data: any;
  if (typeof rawInput === 'string') {
    try {
      let cleaned = rawInput.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, '').replace(/```\s*$/, '').trim();
      }
      data = JSON.parse(cleaned);
    } catch (e: any) {
      return {
        isValid: false,
        errors: [{ id: 'json_syntax', message: `Invalid JSON syntax: ${e.message}` }],
        warnings: []
      };
    }
  } else {
    data = rawInput;
  }

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: [{ id: 'invalid_root', message: 'Root of JSON must be an object containing "exam" and "sections".' }],
      warnings: []
    };
  }

  // 1. Exam Metadata
  const examMeta = data.exam || data.metadata || {};
  if (!examMeta.title) {
    warnings.push('Exam metadata is missing a title; defaulting to "Standard Examination".');
  }

  // 2. Sections Array Check
  const sections = data.sections || [];
  if (!Array.isArray(sections)) {
    return {
      isValid: false,
      errors: [{ id: 'missing_sections', message: '"sections" must be an array.' }],
      warnings
    };
  }

  if (sections.length !== 7) {
    errors.push({
      id: 'section_count',
      message: `Exam must contain exactly 7 sections. Found ${sections.length}.`
    });
  }

  // Check section order & IDs
  const expectedOrder = ['mcq', 'matching', 'correct_wrong', 'cloze', 'find_mistake', 'controlled_answer', 'reorder'];
  const allQuestionIds = new Set<string>();

  let totalQuestionsFound = 0;
  let totalMarksFound = 0;

  sections.forEach((sec, sIdx) => {
    const expectedSecDef = EXPECTED_STANDARD_SECTIONS[sIdx];
    const expectedId = expectedOrder[sIdx];
    const secId = String(sec.id || '').toLowerCase().replace(/[- ]/g, '_');

    // Section ordering validation
    if (expectedId && !secId.includes(expectedId)) {
      errors.push({
        id: `section_order_${sIdx}`,
        sectionId: sec.id,
        message: `Section ${sIdx + 1} is "${sec.title || sec.id}". Expected "${expectedSecDef?.sectionCode} — ${expectedSecDef?.title}" (${expectedId}).`
      });
    }

    const questions = sec.questions || [];
    if (!Array.isArray(questions)) {
      errors.push({
        id: `sec_${sIdx}_not_array`,
        sectionId: sec.id,
        message: `Section "${sec.title || sIdx + 1}" must have an array of questions.`
      });
      return;
    }

    const expectedCount = expectedSecDef?.questionCount || 5;
    const expectedMarksPerQ = expectedSecDef?.marksPerQuestion || 2;

    if (questions.length !== expectedCount) {
      errors.push({
        id: `sec_${sIdx}_count_mismatch`,
        sectionId: sec.id,
        message: `Section ${expectedSecDef?.sectionCode || sIdx + 1} contains ${questions.length} questions. Expected exactly ${expectedCount}.`
      });
    }

    // Section B (Matching) duplicate right answer check
    if (sIdx === 1 || secId.includes('matching')) {
      const rights = questions.map((q: any) => String(q.right || q.pair?.right || '').trim()).filter(Boolean);
      const uniqueRights = new Set(rights);
      if (questions.length >= 2 && uniqueRights.size === 1) {
        errors.push({
          id: `matching_duplicate_rights_${sec.id}`,
          sectionId: sec.id,
          message: `Matching Section contains identical right items. All right choices must be distinct.`
        });
      }
    }

    // Section D (Cloze) section-level checks
    if (sIdx === 3 || secId.includes('cloze')) {
      const passage = sec.passage || questions.find((q: any) => q.passage)?.passage;
      if (!passage || !String(passage).trim()) {
        errors.push({
          id: `cloze_missing_passage_${sec.id}`,
          sectionId: sec.id,
          message: `Cloze Passage Section must define a coherent "passage" containing embedded [blank_X] markers.`
        });
      }
    }

    // Validate questions within section
    questions.forEach((q, qIdx) => {
      totalQuestionsFound++;
      const qId = String(q.id || `q_${sIdx}_${qIdx}`).trim();

      // Duplicate question ID check
      if (allQuestionIds.has(qId)) {
        errors.push({
          id: `dup_id_${qId}`,
          questionId: qId,
          sectionId: sec.id,
          message: `Duplicate question ID detected: "${qId}". Each question ID must be unique.`
        });
      }
      allQuestionIds.add(qId);

      const qMarks = Number(q.marks) || expectedMarksPerQ;
      totalMarksFound += qMarks;

      if (qMarks !== expectedMarksPerQ) {
        errors.push({
          id: `marks_mismatch_${qId}`,
          questionId: qId,
          sectionId: sec.id,
          message: `Question "${qId}" has ${qMarks} marks. Expected ${expectedMarksPerQ} marks.`
        });
      }

      // SECTION-SPECIFIC RULES
      // Section A: MCQ
      if (sIdx === 0 || secId.includes('mcq')) {
        const opts = q.options || [];
        if (!Array.isArray(opts) || opts.length !== 4) {
          errors.push({
            id: `mcq_opts_${qId}`,
            questionId: qId,
            message: `MCQ Question "${qId}" must have exactly 4 options. Found ${Array.isArray(opts) ? opts.length : 0}.`
          });
        }
        if (!q.correctAnswer && !q.correct_answer && q.correctAnswer !== 0) {
          errors.push({
            id: `mcq_ans_${qId}`,
            questionId: qId,
            message: `MCQ Question "${qId}" has no correct answer.`
          });
        }
      }

      // Section B: Matching
      else if (sIdx === 1 || secId.includes('matching')) {
        const hasLeft = Boolean(q.left || q.pair?.left);
        const hasRight = Boolean(q.right || q.pair?.right);
        if (!hasLeft || !hasRight) {
          errors.push({
            id: `matching_pair_${qId}`,
            questionId: qId,
            message: `Matching Question "${qId}" must define both "left" and "right" items.`
          });
        }
      }

      // Section C: Correct or Wrong
      else if (sIdx === 2 || secId.includes('correct_wrong')) {
        const statement = q.statement || q.question;
        if (!statement || !String(statement).trim()) {
          errors.push({
            id: `cw_statement_${qId}`,
            questionId: qId,
            message: `Correct/Wrong Question "${qId}" is missing a statement.`
          });
        }
        const ans = String(q.correctAnswer ?? q.correct_answer ?? '').toUpperCase();
        if (ans !== 'CORRECT' && ans !== 'WRONG' && ans !== 'TRUE' && ans !== 'FALSE') {
          errors.push({
            id: `cw_ans_${qId}`,
            questionId: qId,
            message: `Correct/Wrong Question "${qId}" correctAnswer must be "CORRECT" or "WRONG". Found "${ans}".`
          });
        }
      }

      // Section D: Cloze
      else if (sIdx === 3 || secId.includes('cloze')) {
        const opts = q.options || [];
        if (!Array.isArray(opts) || opts.length < 2) {
          errors.push({
            id: `cloze_opts_${qId}`,
            questionId: qId,
            message: `Cloze Question "${qId}" must have at least 2 dropdown options.`
          });
        }
        if (!q.correctAnswer && !q.correct_answer) {
          errors.push({
            id: `cloze_ans_${qId}`,
            questionId: qId,
            message: `Cloze Question "${qId}" is missing a correct answer.`
          });
        }
      }

      // Section E: Find the Mistake
      else if (sIdx === 4 || secId.includes('find_mistake')) {
        const incorrectTok = q.incorrectToken || q.incorrect_token || q.target;
        if (!incorrectTok) {
          errors.push({
            id: `fm_no_token_${qId}`,
            questionId: qId,
            message: `Find Mistake Question "${qId}" has no incorrect token specified. Expected exactly 1.`
          });
        }
        if (Array.isArray(incorrectTok) && incorrectTok.length !== 1) {
          errors.push({
            id: `fm_multi_token_${qId}`,
            questionId: qId,
            message: `Question "${qId}" has ${incorrectTok.length} incorrect tokens. Expected exactly 1.`
          });
        }
        if (!q.correction) {
          warnings.push(`Find Mistake Question "${qId}" has no correction provided.`);
        }
      }

      // Section F: Controlled Type Answer
      else if (sIdx === 5 || secId.includes('controlled')) {
        const hasAccepted =
          (Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0) ||
          (Array.isArray(q.accepted_answers) && q.accepted_answers.length > 0) ||
          Boolean(q.answer) ||
          Boolean(q.correctAnswer);
        if (!hasAccepted) {
          errors.push({
            id: `ca_no_ans_${qId}`,
            questionId: qId,
            message: `Question "${qId}" has no accepted answer.`
          });
        }
      }

      // Section G: Reorder
      else if (sIdx === 6 || secId.includes('reorder')) {
        const hasOrder =
          (Array.isArray(q.correctOrder) && q.correctOrder.length > 1) ||
          (Array.isArray(q.correct_order) && q.correct_order.length > 1) ||
          (typeof q.targetSentence === 'string' && q.targetSentence.trim().length > 0);
        if (!hasOrder) {
          errors.push({
            id: `ro_no_order_${qId}`,
            questionId: qId,
            message: `Reorder Question "${qId}" has no valid token order.`
          });
        }
      }
    });
  });

  // Check Cloze Section has passage
  const clozeSec = sections.find((s) => String(s.id).toLowerCase().includes('cloze')) || sections[3];
  if (clozeSec && !clozeSec.passage && !clozeSec.questions?.[0]?.passage) {
    warnings.push('Cloze Passage section is missing a continuous passage text.');
  }

  // Total questions count check
  if (totalQuestionsFound !== 40) {
    errors.push({
      id: 'total_questions_mismatch',
      message: `Total question count is ${totalQuestionsFound}. Expected exactly 40.`
    });
  }

  // Total marks check
  if (totalMarksFound !== 100) {
    errors.push({
      id: 'total_marks_mismatch',
      message: `Total exam marks is ${totalMarksFound}. Expected exactly 100 marks.`
    });
  }

  const isValid = errors.length === 0;

  let canonicalAssessment: CanonicalAssessmentV2 | undefined = undefined;
  if (isValid) {
    canonicalAssessment = mapStandardPackageToCanonical(data);
  }

  return {
    isValid,
    errors,
    warnings,
    stats: {
      totalQuestions: totalQuestionsFound,
      totalMarks: totalMarksFound,
      sectionsCount: sections.length
    },
    canonicalAssessment
  };
}

/**
 * Maps the validated AI JSON package into canonical EdTechra Assessment Schema
 */
export function mapStandardPackageToCanonical(data: any): CanonicalAssessmentV2 {
  const meta = data.exam || {};
  const sections = data.sections || [];

  const canonicalSections: ExamSection[] = sections.map((sec: any, sIdx: number) => {
    const rawQuestions = sec.questions || [];
    const secId = sec.id || `sec_${sIdx + 1}`;

    const canonicalQuestions: CanonicalQuestion[] = rawQuestions.map((q: any, qIdx: number) => {
      const qId = q.id || `q_${secId}_${qIdx + 1}`;
      const qMarks = Number(q.marks) || (sIdx === 4 || sIdx === 5 ? 3 : sIdx === 6 ? 4 : 2);

      // Section A: MCQ
      if (sIdx === 0 || String(sec.id).includes('mcq')) {
        const opts = (q.options || []).map((opt: any, oIdx: number) => {
          const letter = String.fromCharCode(65 + oIdx);
          if (typeof opt === 'string') {
            return { id: opt, text: opt };
          }
          return { id: opt.id || letter, text: opt.text || opt.id || '' };
        });

        return {
          id: qId,
          type: 'multiple_choice',
          question: q.question || `Question ${qIdx + 1}`,
          options: opts,
          correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer : [String(q.correctAnswer || opts[0]?.text || 'a')],
          marks: qMarks,
          difficulty: 'medium',
          explanation: q.explanation
        } as MultipleChoiceQuestion;
      }

      // Section B: Matching
      if (sIdx === 1 || String(sec.id).includes('matching')) {
        const left = q.left || q.pair?.left || `Item ${qIdx + 1}`;
        const right = q.right || q.pair?.right || `Match ${qIdx + 1}`;

        return {
          id: qId,
          type: 'matching',
          question: q.question || `Match the corresponding pair for: ${left}`,
          pairs: [{ id: `p_${qId}`, left, right }],
          left,
          right,
          correctAnswer: right,
          marks: qMarks,
          difficulty: 'medium',
          explanation: q.explanation
        } as any;
      }

      // Section C: Correct or Wrong
      if (sIdx === 2 || String(sec.id).includes('correct_wrong')) {
        const statement = q.statement || q.question || '';
        const rawAns = String(q.correctAnswer || q.correct_answer || 'CORRECT').toUpperCase();

        return {
          id: qId,
          type: 'true_false',
          standardType: 'correct_wrong',
          question: statement,
          statement,
          correctAnswer: rawAns,
          marks: qMarks,
          difficulty: 'easy',
          explanation: q.explanation
        } as any;
      }

      // Section D: Cloze
      if (sIdx === 3 || String(sec.id).includes('cloze')) {
        const opts = (q.options || []).map((o: any) => (typeof o === 'string' ? o : o.text || o.id));
        const blankId = q.blankId || `blank_${q.blankIndex || qIdx + 1}`;
        const passage = sec.passage || q.passage || '';

        return {
          id: qId,
          type: 'cloze_passage',
          standardType: 'cloze',
          question: q.question || `Select the correct word for ${blankId}`,
          passage,
          blankId,
          options: opts,
          correctAnswer: q.correctAnswer || opts[0] || '',
          marks: qMarks,
          difficulty: 'medium',
          explanation: q.explanation
        } as any;
      }

      // Section E: Find the Mistake
      if (sIdx === 4 || String(sec.id).includes('find_mistake')) {
        const sentence = q.sentence || q.question || '';
        const tokens = q.tokens || sentence.trim().split(/\s+/);
        const incorrectToken = q.incorrectToken || q.incorrect_token || '';
        const tokenIndex = q.tokenIndex ?? q.token_index ?? 0;

        return {
          id: qId,
          type: 'short_answer',
          standardType: 'find_mistake',
          question: sentence,
          sentence,
          tokens,
          incorrectToken,
          tokenIndex,
          correction: q.correction || '',
          correctAnswer: incorrectToken,
          marks: qMarks,
          difficulty: 'medium',
          explanation: q.explanation || `The mistake is "${incorrectToken}". Correct form: "${q.correction || ''}".`
        } as any;
      }

      // Section F: Controlled Type Answer
      if (sIdx === 5 || String(sec.id).includes('controlled')) {
        const prompt = q.question || q.prompt || '';
        const answer = q.answer || q.correctAnswer || '';
        const acceptedAnswers = Array.isArray(q.acceptedAnswers)
          ? q.acceptedAnswers
          : Array.isArray(q.accepted_answers)
          ? q.accepted_answers
          : [answer].filter(Boolean);

        return {
          id: qId,
          type: 'fill_in_blank',
          standardType: 'controlled_answer',
          question: prompt,
          answer,
          acceptedAnswers,
          correctAnswer: answer,
          marks: qMarks,
          difficulty: 'medium',
          explanation: q.explanation
        } as any;
      }

      // Section G: Reorder
      if (sIdx === 6 || String(sec.id).includes('reorder')) {
        const correctOrder = q.correctOrder || q.correct_order || [];
        const words = q.words || [...correctOrder].sort(() => Math.random() - 0.5);

        return {
          id: qId,
          type: 'reorder',
          standardType: 'reorder',
          question: q.question || 'Arrange the words in the correct order:',
          words,
          correctOrder,
          correctAnswer: correctOrder.join(' '),
          marks: qMarks,
          difficulty: 'hard',
          explanation: q.explanation || `Correct order: ${correctOrder.join(' ')}`
        } as any;
      }

      // Fallback
      return {
        id: qId,
        type: 'multiple_choice',
        question: q.question || `Question ${qIdx + 1}`,
        options: [{ id: 'a', text: 'Option A' }],
        correctAnswer: ['a'],
        marks: qMarks,
        difficulty: 'medium'
      } as any;
    });

    const secPassage = sec.passage || rawQuestions.find((q: any) => q.passage)?.passage;
    return {
      id: secId,
      title: sec.title || EXPECTED_STANDARD_SECTIONS[sIdx]?.title || `Section ${String.fromCharCode(65 + sIdx)}`,
      passage: secPassage,
      questions: canonicalQuestions
    };
  });

  return {
    schemaVersion: '2.0',
    assessmentType: 'exam',
    exam: {
      title: meta.title || 'Standard Examination',
      subject: meta.subject || 'English Language',
      grade: meta.grade || 'Grade 10',
      examType: 'Standard Exam',
      difficulty: 'Medium',
      durationMinutes: Number(meta.durationMinutes) || 60,
      totalMarks: 100,
      passPercentage: Number(meta.passPercentage) || 50,
      showMarksImmediately: true,
      showCorrectAnswers: true,
      description: 'EdTechra Standard 100-Mark Examination with 7 Controlled Sections'
    },
    sections: canonicalSections
  };
}

/**
 * Builds AI Correction Prompt when validation fails so the teacher can easily fix it with AI
 */
export function buildStandardCorrectionPrompt(errors: StandardValidationError[]): string {
  const errorBulletList = errors.map((err, i) => `${i + 1}. ${err.message}`).join('\n');

  return `The examination JSON you provided failed EdTechra Standard Exam validation with the following errors:

${errorBulletList}

Please fix ALL errors above and return the COMPLETE, fully corrected exam JSON.
Remember:
- Exactly 7 sections in order (mcq, matching, correct_wrong, cloze, find_mistake, controlled_answer, reorder).
- Total: Exactly 40 questions and 100 marks.
- Return ONLY valid raw JSON with no markdown fences, no comments, and no extra text.`;
}

/**
 * Generates the complete 7-section, 40-question, 100-mark Standard Exam Blueprint
 */
export function generateStandardExam2Blueprint(input: {
  subject?: string;
  grade?: string;
  topic?: string;
  lessonNotes?: string;
  difficulty?: string;
  durationMinutes?: number;
}): CanonicalAssessmentV2 {
  const {
    subject = 'English Language',
    grade = 'Grade 10',
    topic = 'The Simple Past',
    lessonNotes = '',
    difficulty = 'Medium',
    durationMinutes = 60
  } = input;

  const timestamp = Date.now().toString(36).slice(-4);

  // SECTION A: MCQ (10 Questions x 2 Marks = 20 Marks)
  const secAQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_mcq_1`,
      type: 'multiple_choice',
      question: `Which sentence correctly demonstrates the core rule of ${topic}?`,
      options: [
        { id: 'a', text: 'Sarah visited the national museum yesterday afternoon.' },
        { id: 'b', text: 'Sarah visiting the national museum yesterday afternoon.' },
        { id: 'c', text: 'Sarah visits the national museum yesterday afternoon.' },
        { id: 'd', text: 'Sarah has visit the national museum yesterday afternoon.' }
      ],
      correctAnswer: ['a'],
      difficulty: 'easy',
      marks: 2,
      explanation: 'Option A uses the correct past tense form ("visited") with the past time marker "yesterday".'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_2`,
      type: 'multiple_choice',
      question: 'What is the correct negative sentence structure?',
      options: [
        { id: 'a', text: 'They did not arrived at the station on time.' },
        { id: 'b', text: 'They did not arrive at the station on time.' },
        { id: 'c', text: 'They not arrived at the station on time.' },
        { id: 'd', text: 'They do not arrived at the station on time.' }
      ],
      correctAnswer: ['b'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'Negative statements with "did not" require the base form of the verb ("arrive").'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_3`,
      type: 'multiple_choice',
      question: 'Which question correctly asks about a past action?',
      options: [
        { id: 'a', text: 'Did you watched the documentary last night?' },
        { id: 'b', text: 'Were you watch the documentary last night?' },
        { id: 'c', text: 'Did you watch the documentary last night?' },
        { id: 'd', text: 'Do you watched the documentary last night?' }
      ],
      correctAnswer: ['c'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'Questions starting with the auxiliary "Did" require the base form "watch".'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_4`,
      type: 'multiple_choice',
      question: 'Choose the sentence with the correct irregular verb form:',
      options: [
        { id: 'a', text: 'The teacher write a letter to the principal yesterday.' },
        { id: 'b', text: 'The teacher writed a letter to the principal yesterday.' },
        { id: 'c', text: 'The teacher wrote a letter to the principal yesterday.' },
        { id: 'd', text: 'The teacher writted a letter to the principal yesterday.' }
      ],
      correctAnswer: ['c'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of the irregular verb "write" is "wrote".'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_5`,
      type: 'multiple_choice',
      question: 'Which time expression is specifically used to indicate completed past time?',
      options: [
        { id: 'a', text: 'Right now' },
        { id: 'b', text: 'Three days ago' },
        { id: 'c', text: 'Every Monday' },
        { id: 'd', text: 'At this moment' }
      ],
      correctAnswer: ['b'],
      difficulty: 'easy',
      marks: 2,
      explanation: '"Ago" indicates a specific completed period prior to the present.'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_6`,
      type: 'multiple_choice',
      question: 'Identify the sentence with correct subject-verb agreement in the past tense of "be":',
      options: [
        { id: 'a', text: 'Both candidates was present at the auditorium.' },
        { id: 'b', text: 'Both candidates were present at the auditorium.' },
        { id: 'c', text: 'Both candidates is present at the auditorium.' },
        { id: 'd', text: 'Both candidates are present yesterday.' }
      ],
      correctAnswer: ['b'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'Plural subject "Both candidates" takes the plural past verb "were".'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_7`,
      type: 'multiple_choice',
      question: 'Complete the sentence: "When the telephone rang, Father ______ outside to answer it."',
      options: [
        { id: 'a', text: 'stepped' },
        { id: 'b', text: 'steps' },
        { id: 'c', text: 'stepping' },
        { id: 'd', text: 'is stepping' }
      ],
      correctAnswer: ['a'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'Sequential past events require consistent simple past forms ("rang" -> "stepped").'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_8`,
      type: 'multiple_choice',
      question: 'Which question correctly uses a WH- question word for a past event?',
      options: [
        { id: 'a', text: 'Where did you bought that dictionary?' },
        { id: 'b', text: 'Where did you buy that dictionary?' },
        { id: 'c', text: 'Where you bought that dictionary?' },
        { id: 'd', text: 'Where did you buying that dictionary?' }
      ],
      correctAnswer: ['b'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'WH- questions with "did" take the base verb form "buy".'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_9`,
      type: 'multiple_choice',
      question: 'Select the sentence where the spelling of the regular past verb ending in "-ed" is correct:',
      options: [
        { id: 'a', text: 'The children stoped playing when it began to rain.' },
        { id: 'b', text: 'The children stopped playing when it began to rain.' },
        { id: 'c', text: 'The children stopied playing when it began to rain.' },
        { id: 'd', text: 'The children stopt playing when it began to rain.' }
      ],
      correctAnswer: ['b'],
      difficulty: 'medium',
      marks: 2,
      explanation: 'Single-syllable verbs ending in consonant-vowel-consonant double the final consonant ("stop" -> "stopped").'
    } as MultipleChoiceQuestion,
    {
      id: `q_${timestamp}_mcq_10`,
      type: 'multiple_choice',
      question: 'Which sentence correctly expresses a past habit or routine?',
      options: [
        { id: 'a', text: 'Grandfather used to walk five miles every morning.' },
        { id: 'b', text: 'Grandfather use to walked five miles every morning.' },
        { id: 'c', text: 'Grandfather using to walk five miles every morning.' },
        { id: 'd', text: 'Grandfather used to walked five miles every morning.' }
      ],
      correctAnswer: ['a'],
      difficulty: 'hard',
      marks: 2,
      explanation: '"Used to" is followed by the bare infinitive "walk" to express past habits.'
    } as MultipleChoiceQuestion
  ];

  // SECTION B: MATCHING (5 Questions x 2 Marks = 10 Marks)
  const secBQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_mat_1`,
      type: 'matching',
      question: 'Match the base verb with its correct past tense form: "begin"',
      left: 'begin',
      right: 'began',
      pairs: [{ id: 'p1', left: 'begin', right: 'began' }],
      correctAnswer: 'began',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of "begin" is "began".'
    } as any,
    {
      id: `q_${timestamp}_mat_2`,
      type: 'matching',
      question: 'Match the base verb with its correct past tense form: "catch"',
      left: 'catch',
      right: 'caught',
      pairs: [{ id: 'p2', left: 'catch', right: 'caught' }],
      correctAnswer: 'caught',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of "catch" is "caught".'
    } as any,
    {
      id: `q_${timestamp}_mat_3`,
      type: 'matching',
      question: 'Match the base verb with its correct past tense form: "freeze"',
      left: 'freeze',
      right: 'froze',
      pairs: [{ id: 'p3', left: 'freeze', right: 'froze' }],
      correctAnswer: 'froze',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of "freeze" is "froze".'
    } as any,
    {
      id: `q_${timestamp}_mat_4`,
      type: 'matching',
      question: 'Match the base verb with its correct past tense form: "speak"',
      left: 'speak',
      right: 'spoke',
      pairs: [{ id: 'p4', left: 'speak', right: 'spoke' }],
      correctAnswer: 'spoke',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of "speak" is "spoke".'
    } as any,
    {
      id: `q_${timestamp}_mat_5`,
      type: 'matching',
      question: 'Match the base verb with its correct past tense form: "teach"',
      left: 'teach',
      right: 'taught',
      pairs: [{ id: 'p5', left: 'teach', right: 'taught' }],
      correctAnswer: 'taught',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The past tense of "teach" is "taught".'
    } as any
  ];

  // SECTION C: CORRECT OR WRONG (5 Questions x 2 Marks = 10 Marks)
  const secCQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_cw_1`,
      type: 'true_false',
      standardType: 'correct_wrong',
      question: 'She went to school yesterday.',
      statement: 'She went to school yesterday.',
      correctAnswer: 'CORRECT',
      difficulty: 'easy',
      marks: 2,
      explanation: 'The sentence correctly pairs "went" with the completed past indicator "yesterday".'
    } as any,
    {
      id: `q_${timestamp}_cw_2`,
      type: 'true_false',
      standardType: 'correct_wrong',
      question: "They didn't went to the concert last Friday.",
      statement: "They didn't went to the concert last Friday.",
      correctAnswer: 'WRONG',
      difficulty: 'easy',
      marks: 2,
      explanation: 'The auxiliary "didn\'t" requires the base verb "go", not the past form "went".'
    } as any,
    {
      id: `q_${timestamp}_cw_3`,
      type: 'true_false',
      standardType: 'correct_wrong',
      question: 'Did you see the lunar eclipse last night?',
      statement: 'Did you see the lunar eclipse last night?',
      correctAnswer: 'CORRECT',
      difficulty: 'medium',
      marks: 2,
      explanation: 'Correct question structure using auxiliary "Did" followed by the base verb "see".'
    } as any,
    {
      id: `q_${timestamp}_cw_4`,
      type: 'true_false',
      standardType: 'correct_wrong',
      question: 'We was very happy with our examination results.',
      statement: 'We was very happy with our examination results.',
      correctAnswer: 'WRONG',
      difficulty: 'easy',
      marks: 2,
      explanation: 'Plural subject "We" requires the plural past verb "were", not "was".'
    } as any,
    {
      id: `q_${timestamp}_cw_5`,
      type: 'true_false',
      standardType: 'correct_wrong',
      question: 'The bell rang five minutes ago.',
      statement: 'The bell rang five minutes ago.',
      correctAnswer: 'CORRECT',
      difficulty: 'medium',
      marks: 2,
      explanation: '"The bell rang" accurately uses the past form of "ring" with "five minutes ago".'
    } as any
  ];

  // SECTION D: CLOZE PASSAGE WITH DROPDOWNS (5 Questions x 2 Marks = 10 Marks)
  const clozePassageText = `Last Saturday, our family [blank_1] to the national wildlife park. We [blank_2] our tickets at the main entrance gate. During the safari tour, we [blank_3] several wild elephants near the river. Father [blank_4] many wonderful photographs of the scenery. By late evening, everyone [blank_5] home safely after an unforgettable journey.`;

  const secDQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_cloze_1`,
      type: 'cloze_passage',
      standardType: 'cloze',
      question: 'Select the correct word for Blank 1:',
      passage: clozePassageText,
      blankId: 'blank_1',
      blankIndex: 1,
      options: ['travelled', 'travels', 'travelling', 'travel'],
      correctAnswer: 'travelled',
      difficulty: 'medium',
      marks: 2,
      explanation: 'The completed past narrative requires the past tense "travelled".'
    } as any,
    {
      id: `q_${timestamp}_cloze_2`,
      type: 'cloze_passage',
      standardType: 'cloze',
      question: 'Select the correct word for Blank 2:',
      passage: clozePassageText,
      blankId: 'blank_2',
      blankIndex: 2,
      options: ['bought', 'buy', 'buying', 'buys'],
      correctAnswer: 'bought',
      difficulty: 'medium',
      marks: 2,
      explanation: 'Irregular past tense of "buy" is "bought".'
    } as any,
    {
      id: `q_${timestamp}_cloze_3`,
      type: 'cloze_passage',
      standardType: 'cloze',
      question: 'Select the correct word for Blank 3:',
      passage: clozePassageText,
      blankId: 'blank_3',
      blankIndex: 3,
      options: ['saw', 'see', 'seen', 'seeing'],
      correctAnswer: 'saw',
      difficulty: 'medium',
      marks: 2,
      explanation: 'Irregular past tense of "see" is "saw".'
    } as any,
    {
      id: `q_${timestamp}_cloze_4`,
      type: 'cloze_passage',
      standardType: 'cloze',
      question: 'Select the correct word for Blank 4:',
      passage: clozePassageText,
      blankId: 'blank_4',
      blankIndex: 4,
      options: ['took', 'take', 'taken', 'taking'],
      correctAnswer: 'took',
      difficulty: 'medium',
      marks: 2,
      explanation: 'Irregular past tense of "take" is "took".'
    } as any,
    {
      id: `q_${timestamp}_cloze_5`,
      type: 'cloze_passage',
      standardType: 'cloze',
      question: 'Select the correct word for Blank 5:',
      passage: clozePassageText,
      blankId: 'blank_5',
      blankIndex: 5,
      options: ['returned', 'return', 'returns', 'returning'],
      correctAnswer: 'returned',
      difficulty: 'medium',
      marks: 2,
      explanation: 'Regular past tense "returned".'
    } as any
  ];

  // SECTION E: FIND THE MISTAKE (5 Questions x 3 Marks = 15 Marks)
  const secEQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_fm_1`,
      type: 'short_answer',
      standardType: 'find_mistake',
      question: 'She go to school yesterday morning.',
      sentence: 'She go to school yesterday morning.',
      tokens: ['She', 'go', 'to', 'school', 'yesterday', 'morning.'],
      incorrectToken: 'go',
      tokenIndex: 1,
      correction: 'went',
      correctAnswer: 'go',
      difficulty: 'medium',
      marks: 3,
      explanation: '"go" must be replaced with the past tense form "went".'
    } as any,
    {
      id: `q_${timestamp}_fm_2`,
      type: 'short_answer',
      standardType: 'find_mistake',
      question: 'Yesterday they seed an interesting film at the cinema.',
      sentence: 'Yesterday they seed an interesting film at the cinema.',
      tokens: ['Yesterday', 'they', 'seed', 'an', 'interesting', 'film', 'at', 'the', 'cinema.'],
      incorrectToken: 'seed',
      tokenIndex: 2,
      correction: 'saw',
      correctAnswer: 'seed',
      difficulty: 'medium',
      marks: 3,
      explanation: '"seed" is incorrect. The past tense of "see" is "saw".'
    } as any,
    {
      id: `q_${timestamp}_fm_3`,
      type: 'short_answer',
      standardType: 'find_mistake',
      question: 'Did Sarah arrived on time for the examination?',
      sentence: 'Did Sarah arrived on time for the examination?',
      tokens: ['Did', 'Sarah', 'arrived', 'on', 'time', 'for', 'the', 'examination?'],
      incorrectToken: 'arrived',
      tokenIndex: 2,
      correction: 'arrive',
      correctAnswer: 'arrived',
      difficulty: 'medium',
      marks: 3,
      explanation: 'After the auxiliary "Did", the verb must be in its base form "arrive".'
    } as any,
    {
      id: `q_${timestamp}_fm_4`,
      type: 'short_answer',
      standardType: 'find_mistake',
      question: "He didn't brought his science notebook yesterday.",
      sentence: "He didn't brought his science notebook yesterday.",
      tokens: ['He', "didn't", 'brought', 'his', 'science', 'notebook', 'yesterday.'],
      incorrectToken: 'brought',
      tokenIndex: 2,
      correction: 'bring',
      correctAnswer: 'brought',
      difficulty: 'medium',
      marks: 3,
      explanation: 'After "didn\'t", the base form "bring" must be used instead of "brought".'
    } as any,
    {
      id: `q_${timestamp}_fm_5`,
      type: 'short_answer',
      standardType: 'find_mistake',
      question: 'We was very tired after the long football match.',
      sentence: 'We was very tired after the long football match.',
      tokens: ['We', 'was', 'very', 'tired', 'after', 'the', 'long', 'football', 'match.'],
      incorrectToken: 'was',
      tokenIndex: 1,
      correction: 'were',
      correctAnswer: 'was',
      difficulty: 'medium',
      marks: 3,
      explanation: 'The plural subject "We" requires the plural past verb "were".'
    } as any
  ];

  // SECTION F: CONTROLLED TYPE THE ANSWER (5 Questions x 3 Marks = 15 Marks)
  const secFQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_ca_1`,
      type: 'fill_in_blank',
      standardType: 'controlled_answer',
      question: 'Yesterday, Sarah ______ to school by bicycle. (go)',
      answer: 'went',
      acceptedAnswers: ['went'],
      correctAnswer: 'went',
      difficulty: 'medium',
      marks: 3,
      explanation: 'The simple past tense of "go" is "went".'
    } as any,
    {
      id: `q_${timestamp}_ca_2`,
      type: 'fill_in_blank',
      standardType: 'controlled_answer',
      question: 'Tom ______ football with his teammates yesterday afternoon. (play)',
      answer: 'played',
      acceptedAnswers: ['played'],
      correctAnswer: 'played',
      difficulty: 'easy',
      marks: 3,
      explanation: 'Regular past tense of "play" is "played".'
    } as any,
    {
      id: `q_${timestamp}_ca_3`,
      type: 'fill_in_blank',
      standardType: 'controlled_answer',
      question: "The train ______ the platform at exactly eight o'clock this morning. (leave)",
      answer: 'left',
      acceptedAnswers: ['left'],
      correctAnswer: 'left',
      difficulty: 'medium',
      marks: 3,
      explanation: 'The past tense of "leave" is "left".'
    } as any,
    {
      id: `q_${timestamp}_ca_4`,
      type: 'fill_in_blank',
      standardType: 'controlled_answer',
      question: 'I ______ receive your email until this morning. (did not / negative of do)',
      answer: 'did not',
      acceptedAnswers: ['did not', "didn't"],
      correctAnswer: 'did not',
      difficulty: 'medium',
      marks: 3,
      explanation: 'Negative past auxiliary: "did not" or "didn\'t".'
    } as any,
    {
      id: `q_${timestamp}_ca_5`,
      type: 'fill_in_blank',
      standardType: 'controlled_answer',
      question: 'The students ______ very attentive during the revision class. (be / plural past)',
      answer: 'were',
      acceptedAnswers: ['were'],
      correctAnswer: 'were',
      difficulty: 'medium',
      marks: 3,
      explanation: 'Plural past of "be" is "were".'
    } as any
  ];

  // SECTION G: REORDER THE SENTENCE (5 Questions x 4 Marks = 20 Marks)
  const secGQuestions: CanonicalQuestion[] = [
    {
      id: `q_${timestamp}_ro_1`,
      type: 'reorder',
      standardType: 'reorder',
      question: 'Tap the words in the correct order to form a sentence:',
      words: ['yesterday.', 'went', 'school', 'She', 'to'],
      correctOrder: ['She', 'went', 'to', 'school', 'yesterday.'],
      correctAnswer: 'She went to school yesterday.',
      difficulty: 'medium',
      marks: 4,
      explanation: 'Subject ("She") + Verb ("went") + Prepositional phrase ("to school") + Time adverbial ("yesterday.").'
    } as any,
    {
      id: `q_${timestamp}_ro_2`,
      type: 'reorder',
      standardType: 'reorder',
      question: 'Tap the words in the correct order to form a sentence:',
      words: ['a', 'wrote', 'letter', 'He', 'friend.', 'his', 'to'],
      correctOrder: ['He', 'wrote', 'a', 'letter', 'to', 'his', 'friend.'],
      correctAnswer: 'He wrote a letter to his friend.',
      difficulty: 'medium',
      marks: 4,
      explanation: 'Subject + Verb + Direct Object + Indirect Object phrase.'
    } as any,
    {
      id: `q_${timestamp}_ro_3`,
      type: 'reorder',
      standardType: 'reorder',
      question: 'Tap the words in the correct order to form a sentence:',
      words: ['night.', 'see', 'Did', 'last', 'movie', 'the', 'you'],
      correctOrder: ['Did', 'you', 'see', 'the', 'movie', 'last', 'night?'],
      correctAnswer: 'Did you see the movie last night?',
      difficulty: 'hard',
      marks: 4,
      explanation: 'Auxiliary ("Did") + Subject ("you") + Base verb ("see") + Object + Time expression.'
    } as any,
    {
      id: `q_${timestamp}_ro_4`,
      type: 'reorder',
      standardType: 'reorder',
      question: 'Tap the words in the correct order to form a sentence:',
      words: ['dinner', 'cook', 'not', 'did', 'They', 'yesterday.'],
      correctOrder: ['They', 'did', 'not', 'cook', 'dinner', 'yesterday.'],
      correctAnswer: 'They did not cook dinner yesterday.',
      difficulty: 'medium',
      marks: 4,
      explanation: 'Subject + Auxiliary ("did not") + Base verb ("cook") + Object + Time adverbial.'
    } as any,
    {
      id: `q_${timestamp}_ro_5`,
      type: 'reorder',
      standardType: 'reorder',
      question: 'Tap the words in the correct order to form a sentence:',
      words: ['park', 'walked', 'in', 'We', 'quietly', 'the', 'evening.'],
      correctOrder: ['We', 'walked', 'quietly', 'in', 'the', 'park', 'evening.'],
      correctAnswer: 'We walked quietly in the park evening.',
      difficulty: 'hard',
      marks: 4,
      explanation: 'Subject ("We") + Verb ("walked") + Adverb of manner ("quietly") + Prepositional phrase.'
    } as any
  ];

  const sections: ExamSection[] = [
    {
      id: `sec_${timestamp}_mcq`,
      title: 'Section A — Multiple Choice Questions',
      description: 'Choose the single best answer for each question.',
      questions: secAQuestions
    },
    {
      id: `sec_${timestamp}_matching`,
      title: 'Section B — Matching',
      description: 'Tap an item in Column A, then tap its corresponding match in Column B.',
      questions: secBQuestions
    },
    {
      id: `sec_${timestamp}_correct_wrong`,
      title: 'Section C — Correct or Wrong',
      description: 'Read each sentence and decide whether it is grammatically correct or wrong.',
      questions: secCQuestions
    },
    {
      id: `sec_${timestamp}_cloze`,
      title: 'Section D — Cloze Passage',
      passage: clozePassageText,
      description: 'Read the continuous passage and select the correct option for each dropdown blank.',
      questions: secDQuestions
    },
    {
      id: `sec_${timestamp}_find_mistake`,
      title: 'Section E — Find the Mistake',
      description: 'Each sentence contains exactly one error. Tap the incorrect word to select it.',
      questions: secEQuestions
    },
    {
      id: `sec_${timestamp}_controlled_answer`,
      title: 'Section F — Type the Answer',
      description: 'Type the exact missing word or phrase to complete each sentence.',
      questions: secFQuestions
    },
    {
      id: `sec_${timestamp}_reorder`,
      title: 'Section G — Reorder the Sentence',
      description: 'Tap the word chips in order to construct a grammatically correct sentence.',
      questions: secGQuestions
    }
  ];

  return {
    schemaVersion: '2.0',
    assessmentType: 'exam',
    exam: {
      title: `${subject}: ${topic} Examination`,
      subject,
      grade,
      examType: 'Standard Exam',
      difficulty: (difficulty as any) || 'Medium',
      topic,
      description: lessonNotes
        ? `EdTechra Standard 100-Mark Examination on "${topic}" with 7 Controlled Sections (40 Questions). ${lessonNotes.slice(0, 100)}`
        : `EdTechra Standard 100-Mark Examination on "${topic}" with 7 Controlled Sections (40 Questions).`,
      instructions: 'Attempt all 40 questions in order across Sections A through G. Manage your time efficiently.',
      durationMinutes,
      passPercentage: 50,
      totalMarks: 100,
      maxAttempts: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      showMarksImmediately: true,
      showCorrectAnswers: true
    },
    sections
  };
}
