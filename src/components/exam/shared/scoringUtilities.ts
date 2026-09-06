// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SCORING UTILITIES
// ============================================================================

import { CanonicalQuestion, ExamSection, SupportedQuestionType } from './ExamSchema';
import { getQuestionTypeMeta } from './QuestionTypes';

/**
 * Returns default sensible marks for a given question type.
 */
export function getDefaultMarksForType(type: SupportedQuestionType): number {
  const meta = getQuestionTypeMeta(type);
  return meta.defaultMarks || 1;
}

/**
 * Calculates the total marks of an individual question, including subquestions if reading comprehension.
 */
export function calculateQuestionMarks(q: CanonicalQuestion): number {
  if (q.type === 'reading_comprehension') {
    if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
      return q.subQuestions.reduce((acc, sub) => acc + (Number(sub.marks) || 1), 0);
    }
    return Number(q.marks) || 5;
  }
  return Number(q.marks) || getDefaultMarksForType(q.type);
}

/**
 * Calculates total marks for an array of sections.
 */
export function calculateExamTotalMarks(sections: ExamSection[]): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((secAcc, sec) => {
    const qMarks = (sec.questions || []).reduce((qAcc, q) => qAcc + calculateQuestionMarks(q), 0);
    return secAcc + qMarks;
  }, 0);
}

/**
 * Calculates total number of questions (counting reading sub-questions individually).
 */
export function calculateTotalQuestionCount(sections: ExamSection[]): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((secAcc, sec) => {
    return secAcc + (sec.questions || []).reduce((qAcc, q) => {
      if (q.type === 'reading_comprehension' && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
        return qAcc + q.subQuestions.length;
      }
      return qAcc + 1;
    }, 0);
  }, 0);
}

/**
 * Calculates pass threshold in absolute marks.
 */
export function calculatePassMarks(totalMarks: number, passPercentage: number = 40): number {
  if (totalMarks <= 0) return 0;
  return Math.ceil((totalMarks * Math.max(1, Math.min(100, passPercentage))) / 100);
}

/**
 * Determines whether a question type requires human teacher evaluation.
 */
export function isSubjectiveQuestion(type: SupportedQuestionType): boolean {
  return type === 'essay' || type === 'short_answer';
}

/**
 * Flattens all questions across sections into a sequential array for examination navigation.
 */
export interface FlattenedExamQuestion {
  question: CanonicalQuestion;
  sectionId: string;
  sectionTitle: string;
  globalIndex: number; // 0-indexed
  displayNumber: number; // 1-indexed
  parentPassage?: string;
  parentPassageTitle?: string;
}

export function flattenExamQuestions(sections: ExamSection[]): FlattenedExamQuestion[] {
  const result: FlattenedExamQuestion[] = [];
  let globalIndex = 0;

  (sections || []).forEach((sec) => {
    (sec.questions || []).forEach((q) => {
      if (q.type === 'reading_comprehension' && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
        q.subQuestions.forEach((subQ) => {
          result.push({
            question: subQ,
            sectionId: sec.id,
            sectionTitle: sec.title,
            globalIndex,
            displayNumber: globalIndex + 1,
            parentPassage: q.passage,
            parentPassageTitle: q.passageTitle
          });
          globalIndex++;
        });
      } else {
        result.push({
          question: q,
          sectionId: sec.id,
          sectionTitle: sec.title,
          globalIndex,
          displayNumber: globalIndex + 1,
          parentPassage: sec.passage
        });
        globalIndex++;
      }
    });
  });

  return result;
}
