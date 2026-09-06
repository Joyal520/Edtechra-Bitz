// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: CANONICAL JSON VALIDATOR
// ============================================================================

import {
  CanonicalExamV1,
  CanonicalQuestion,
  ExamSection,
  SupportedQuestionType
} from '../shared/ExamSchema';
import { ALL_QUESTION_TYPES } from '../shared/QuestionTypes';
import { calculateExamTotalMarks, getDefaultMarksForType } from '../shared/scoringUtilities';

export interface ValidationError {
  id: string;
  field?: string;
  message: string;
  questionId?: string;
  sectionId?: string;
}

export interface ValidationWarning {
  id: string;
  field?: string;
  message: string;
  questionId?: string;
  sectionId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  parsedExam?: CanonicalExamV1;
  stats?: {
    sectionCount: number;
    questionCount: number;
    totalMarks: number;
    durationMinutes: number;
  };
}

const VALID_TYPES = new Set<string>(ALL_QUESTION_TYPES.map(q => q.type));

/**
 * Normalizes question type strings from various LLM quirks (e.g., "mcq", "Multiple Choice", "multiple-choice")
 */
export function normalizeQuestionType(typeStr: string): SupportedQuestionType | null {
  if (!typeStr) return null;
  const raw = String(typeStr).trim().toLowerCase();

  if (raw === 'multiple_choice' || raw === 'mcq' || raw.includes('multiple choice')) return 'multiple_choice';
  if (raw === 'multiple_select' || raw.includes('multiple select') || raw.includes('multi-select')) return 'multiple_select';
  if (raw === 'true_false' || raw === 'true/false' || raw.includes('true or false') || raw.includes('true_false')) return 'true_false';
  if (raw === 'fill_in_blank' || raw === 'fill_in_the_blank' || raw.includes('blanks') || raw.includes('blank')) return 'fill_in_blank';
  if (raw === 'matching' || raw.includes('matching')) return 'matching';
  if (raw === 'reorder' || raw.includes('reorder') || raw.includes('sequence') || raw.includes('sequencing')) return 'reorder';
  if (raw === 'short_answer' || raw.includes('short answer')) return 'short_answer';
  if (raw === 'essay' || raw.includes('essay')) return 'essay';
  if (raw === 'reading_comprehension' || raw.includes('comprehension') || raw.includes('reading')) return 'reading_comprehension';
  if (raw === 'image_question' || raw.includes('image')) return 'image_question';
  if (raw === 'audio_question' || raw.includes('audio') || raw.includes('listening')) return 'audio_question';

  return null;
}

/**
 * Strict validator for AI-generated or imported exam JSON
 */
export function validateExamJSON(input: string | Record<string, any>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let data: any;

  // 1. JSON Parse Check
  if (typeof input === 'string') {
    try {
      // Remove any leading/trailing markdown code fences if teacher copied ```json ... ```
      let cleaned = input.trim();
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
    data = input;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: [{ id: 'root_type', message: 'Exam data must be a valid JSON object.' }],
      warnings: []
    };
  }

  // 2. Exam Metadata Validation
  const exam = data.exam || data.metadata || {};
  if (!exam || typeof exam !== 'object') {
    errors.push({ id: 'missing_exam_object', message: 'Missing required "exam" metadata object.' });
  } else {
    if (!exam.title || typeof exam.title !== 'string' || !exam.title.trim()) {
      errors.push({ id: 'missing_title', field: 'exam.title', message: 'Exam title is required.' });
    }
    if (!exam.subject || typeof exam.subject !== 'string' || !exam.subject.trim()) {
      errors.push({ id: 'missing_subject', field: 'exam.subject', message: 'Exam subject is required.' });
    }
    if (exam.durationMinutes !== undefined && (typeof exam.durationMinutes !== 'number' || exam.durationMinutes <= 0)) {
      errors.push({ id: 'invalid_duration', field: 'exam.durationMinutes', message: 'Duration must be a positive number of minutes.' });
    }
    if (exam.passPercentage !== undefined && (typeof exam.passPercentage !== 'number' || exam.passPercentage <= 0 || exam.passPercentage > 100)) {
      errors.push({ id: 'invalid_pass_percentage', field: 'exam.passPercentage', message: 'Pass percentage must be between 1 and 100.' });
    }
  }

  // 3. Sections Validation
  const rawSections = data.sections;
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    errors.push({ id: 'missing_sections', message: 'Exam must contain at least one section with questions.' });
  }

  const validatedSections: ExamSection[] = [];
  const seenQuestionIds = new Set<string>();
  let totalQuestionsCount = 0;

  if (Array.isArray(rawSections)) {
    rawSections.forEach((sec: any, secIdx: number) => {
      const sectionId = sec.id || `section_${secIdx + 1}`;
      const sectionTitle = sec.title || `Section ${secIdx + 1}`;

      if (!sec.questions || !Array.isArray(sec.questions) || sec.questions.length === 0) {
        errors.push({
          id: `empty_section_${sectionId}`,
          sectionId,
          message: `Section "${sectionTitle}" contains no questions.`
        });
        return;
      }

      const validatedQuestions: CanonicalQuestion[] = [];

      sec.questions.forEach((q: any, qIdx: number) => {
        totalQuestionsCount++;
        const questionId = String(q.id || q.questionId || `q_${secIdx + 1}_${qIdx + 1}`).trim();

        // Check duplicate question IDs
        if (seenQuestionIds.has(questionId)) {
          errors.push({
            id: `duplicate_id_${questionId}`,
            questionId,
            sectionId,
            message: `Duplicate question ID detected: "${questionId}". Question IDs must be unique.`
          });
        }
        seenQuestionIds.add(questionId);

        // Normalize question type
        const rawType = q.type || q.questionType || sec.questionType;
        const normalizedType = normalizeQuestionType(rawType);

        if (!normalizedType || !VALID_TYPES.has(normalizedType)) {
          errors.push({
            id: `invalid_type_${questionId}`,
            questionId,
            sectionId,
            message: `Question "${questionId}" has invalid or unsupported type: "${rawType}".`
          });
          return;
        }

        // Question text validation
        const questionText = String(q.question || q.questionText || '').trim();
        if (!questionText && normalizedType !== 'reading_comprehension') {
          errors.push({
            id: `missing_text_${questionId}`,
            questionId,
            sectionId,
            message: `Question "${questionId}" is missing question text.`
          });
        }

        // Marks validation & default assignment
        const marks = Number(q.marks) > 0 ? Number(q.marks) : getDefaultMarksForType(normalizedType);

        // Type-specific strict validations
        if (normalizedType === 'multiple_choice' || normalizedType === 'multiple_select') {
          const rawOptions = q.options;
          if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
            errors.push({
              id: `insufficient_options_${questionId}`,
              questionId,
              sectionId,
              message: `Question "${questionId}" (${normalizedType}) must have at least 2 answer options.`
            });
          }

          // Options normalization
          const options = Array.isArray(rawOptions)
            ? rawOptions.map((opt: any, optIdx: number) => {
                if (typeof opt === 'string') {
                  const letter = String.fromCharCode(97 + optIdx); // a, b, c, d
                  return { id: letter, text: opt.trim() };
                }
                return {
                  id: String(opt.id || String.fromCharCode(97 + optIdx)).trim(),
                  text: String(opt.text || opt.label || '').trim()
                };
              })
            : [];

          const optionIds = new Set(options.map(o => o.id));
          const optionTexts = new Set(options.map(o => o.text.toLowerCase()));

          // Correct answer validation
          const rawCorrect = q.correctAnswer || q.correct_answer || q.correctAnswers;
          let correctAnswers: string[] = [];

          if (Array.isArray(rawCorrect)) {
            correctAnswers = rawCorrect.map(String);
          } else if (typeof rawCorrect === 'string' && rawCorrect.trim()) {
            correctAnswers = [rawCorrect.trim()];
          }

          if (correctAnswers.length === 0) {
            errors.push({
              id: `missing_correct_answer_${questionId}`,
              questionId,
              sectionId,
              message: `Question "${questionId}" is missing correctAnswer.`
            });
          } else {
            // Verify correct answer maps to option ID or option text
            const invalidRefs = correctAnswers.filter(ca => !optionIds.has(ca) && !optionTexts.has(ca.toLowerCase()));
            if (invalidRefs.length > 0) {
              warnings.push({
                id: `correct_answer_reference_${questionId}`,
                questionId,
                sectionId,
                message: `Question "${questionId}" correctAnswer (${correctAnswers.join(', ')}) should match option IDs (${[...optionIds].join(', ')}).`
              });
            }
          }

          validatedQuestions.push({
            id: questionId,
            type: normalizedType,
            question: questionText,
            options,
            correctAnswer: correctAnswers,
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          } as any);
        } else if (normalizedType === 'true_false') {
          const rawCorrect = q.correctAnswer ?? q.correct_answer;
          if (rawCorrect === undefined || rawCorrect === null) {
            errors.push({
              id: `missing_tf_answer_${questionId}`,
              questionId,
              sectionId,
              message: `True/False Question "${questionId}" is missing correctAnswer (true or false).`
            });
          }

          const boolAns = typeof rawCorrect === 'boolean'
            ? rawCorrect
            : String(rawCorrect).trim().toLowerCase() === 'true';

          validatedQuestions.push({
            id: questionId,
            type: 'true_false',
            question: questionText,
            correctAnswer: boolAns,
            difficulty: (q.difficulty || 'easy').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        } else if (normalizedType === 'fill_in_blank') {
          const rawAnswers = q.acceptedAnswers || q.correctAnswer || q.correct_answer || q.answers;
          let accepted: string[] = [];
          if (Array.isArray(rawAnswers)) {
            accepted = rawAnswers.map(a => String(a).trim()).filter(Boolean);
          } else if (typeof rawAnswers === 'string' && rawAnswers.trim()) {
            accepted = [rawAnswers.trim()];
          }

          if (accepted.length === 0) {
            errors.push({
              id: `missing_blank_answer_${questionId}`,
              questionId,
              sectionId,
              message: `Fill-in-the-blank Question "${questionId}" is missing acceptedAnswers.`
            });
          }

          validatedQuestions.push({
            id: questionId,
            type: 'fill_in_blank',
            question: questionText,
            acceptedAnswers: accepted,
            caseSensitive: Boolean(q.caseSensitive),
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        } else if (normalizedType === 'matching') {
          const rawPairs = q.pairs || q.matchingPairs || [];
          if (!Array.isArray(rawPairs) || rawPairs.length < 2) {
            errors.push({
              id: `insufficient_pairs_${questionId}`,
              questionId,
              sectionId,
              message: `Matching Question "${questionId}" requires at least 2 matching pairs.`
            });
          }

          const pairs = (rawPairs || []).map((p: any, pIdx: number) => ({
            id: p.id || `pair_${pIdx + 1}`,
            left: String(p.left || p.term || '').trim(),
            right: String(p.right || p.definition || p.match || '').trim()
          }));

          const brokenPairs = pairs.filter((p: any) => !p.left || !p.right);
          if (brokenPairs.length > 0) {
            errors.push({
              id: `empty_pair_values_${questionId}`,
              questionId,
              sectionId,
              message: `Matching Question "${questionId}" has pairs with empty left or right values.`
            });
          }

          validatedQuestions.push({
            id: questionId,
            type: 'matching',
            question: questionText,
            pairs,
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        } else if (normalizedType === 'reorder') {
          const rawItems = q.items || q.sentences || [];
          if (!Array.isArray(rawItems) || rawItems.length < 2) {
            errors.push({
              id: `insufficient_reorder_items_${questionId}`,
              questionId,
              sectionId,
              message: `Reorder Question "${questionId}" requires at least 2 items to sequence.`
            });
          }

          const items = (rawItems || []).map((it: any, itIdx: number) => {
            if (typeof it === 'string') {
              return { id: `item_${itIdx + 1}`, text: it.trim() };
            }
            return {
              id: String(it.id || `item_${itIdx + 1}`).trim(),
              text: String(it.text || it.content || '').trim()
            };
          });

          const correctOrder = Array.isArray(q.correctOrder)
            ? q.correctOrder.map(String)
            : items.map((i: any) => i.id);

          validatedQuestions.push({
            id: questionId,
            type: 'reorder',
            question: questionText,
            items,
            correctOrder,
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        } else if (normalizedType === 'short_answer') {
          if (!q.rubric && !q.sampleAnswer && !q.explanation) {
            warnings.push({
              id: `missing_rubric_${questionId}`,
              questionId,
              sectionId,
              message: `Short Answer Question "${questionId}" has no grading rubric or sample answer.`
            });
          }

          validatedQuestions.push({
            id: questionId,
            type: 'short_answer',
            question: questionText,
            rubric: q.rubric || q.sampleAnswer,
            sampleAnswer: q.sampleAnswer,
            keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks: Number(q.marks) || 2,
            explanation: q.explanation
          });
        } else if (normalizedType === 'essay') {
          if (!q.rubric && !q.instructions) {
            warnings.push({
              id: `missing_essay_rubric_${questionId}`,
              questionId,
              sectionId,
              message: `Essay Question "${questionId}" has no grading rubric.`
            });
          }

          validatedQuestions.push({
            id: questionId,
            type: 'essay',
            question: questionText,
            minWords: Number(q.minWords) || undefined,
            maxWords: Number(q.maxWords) || undefined,
            rubric: q.rubric,
            sampleAnswer: q.sampleAnswer,
            difficulty: (q.difficulty || 'hard').toLowerCase(),
            marks: Number(q.marks) || 5,
            explanation: q.explanation
          });
        } else if (normalizedType === 'reading_comprehension') {
          const passage = String(q.passage || sec.passage || '').trim();
          if (!passage) {
            errors.push({
              id: `missing_passage_${questionId}`,
              questionId,
              sectionId,
              message: `Reading Comprehension Question "${questionId}" is missing passage text.`
            });
          }

          const rawSubQ = q.subQuestions || q.questions || [];
          if (!Array.isArray(rawSubQ) || rawSubQ.length === 0) {
            errors.push({
              id: `missing_subquestions_${questionId}`,
              questionId,
              sectionId,
              message: `Reading Comprehension Question "${questionId}" contains no sub-questions.`
            });
          }

          validatedQuestions.push({
            id: questionId,
            type: 'reading_comprehension',
            passageTitle: q.passageTitle || 'Reading Passage',
            passage,
            question: questionText || 'Read the following passage and answer the questions below.',
            subQuestions: rawSubQ,
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks: Number(q.marks) || (rawSubQ.length > 0 ? rawSubQ.length : 5),
            explanation: q.explanation
          });
        } else if (normalizedType === 'image_question') {
          validatedQuestions.push({
            id: questionId,
            type: 'image_question',
            imageUrl: q.imageUrl || '',
            caption: q.caption,
            question: questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        } else if (normalizedType === 'audio_question') {
          validatedQuestions.push({
            id: questionId,
            type: 'audio_question',
            audioUrl: q.audioUrl || '',
            transcript: q.transcript,
            question: questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            difficulty: (q.difficulty || 'medium').toLowerCase(),
            marks,
            explanation: q.explanation
          });
        }

        // Warnings for missing explanations
        if (!q.explanation && normalizedType !== 'reading_comprehension') {
          warnings.push({
            id: `missing_explanation_${questionId}`,
            questionId,
            sectionId,
            message: `Question "${questionId}" has no explanation.`
          });
        }
      });

      validatedSections.push({
        id: sectionId,
        title: sectionTitle,
        description: sec.description,
        instructions: sec.instructions,
        passage: sec.passage,
        questions: validatedQuestions
      });
    });
  }

  const isValid = errors.length === 0;

  let parsedExam: CanonicalExamV1 | undefined = undefined;
  let stats: ValidationResult['stats'] = undefined;

  if (isValid) {
    const totalMarks = calculateExamTotalMarks(validatedSections);
    const duration = Number(exam.durationMinutes) || 45;

    parsedExam = {
      schemaVersion: '1.0',
      assessmentType: 'exam',
      exam: {
        title: String(exam.title || 'Classroom Assessment').trim(),
        subject: String(exam.subject || 'General').trim(),
        grade: String(exam.grade || 'All Grades').trim(),
        level: exam.level || 'General',
        examType: exam.examType || 'Unit Test',
        difficulty: exam.difficulty || 'Mixed',
        description: exam.description || '',
        instructions: exam.instructions || '',
        durationMinutes: duration,
        passPercentage: Number(exam.passPercentage) || 40,
        maxAttempts: Number(exam.maxAttempts) || 1,
        scorePolicy: exam.scorePolicy || 'highest',
        randomizeQuestions: Boolean(exam.randomizeQuestions),
        randomizeOptions: Boolean(exam.randomizeOptions),
        showMarksImmediately: exam.showMarksImmediately !== false,
        showCorrectAnswers: exam.showCorrectAnswers !== false,
        password: exam.password || undefined
      },
      requirements: data.requirements || {},
      sections: validatedSections
    };

    stats = {
      sectionCount: validatedSections.length,
      questionCount: totalQuestionsCount,
      totalMarks,
      durationMinutes: duration
    };
  }

  return {
    isValid,
    errors,
    warnings,
    parsedExam,
    stats
  };
}
