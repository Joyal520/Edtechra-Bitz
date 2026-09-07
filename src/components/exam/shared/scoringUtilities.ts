import {
  CanonicalQuestion,
  ExamSection,
  SupportedQuestionType,
  ActivityType,
  PictureTaskType,
  ActivityRubric
} from './ExamSchema';
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
  if (q.type === 'cloze_passage') {
    const clozeQ = q as any;
    return Number(clozeQ.marks) || (Array.isArray(clozeQ.blanks) && clozeQ.blanks.length > 0 ? clozeQ.blanks.length : 5);
  }
  return Number(q.marks) || getDefaultMarksForType(q.type);
}

/**
 * Calculates total marks for an array of sections (including activities).
 */
export function calculateExamTotalMarks(sections: ExamSection[]): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((secAcc, sec) => {
    const qMarks = (sec.questions || []).reduce((qAcc, q) => qAcc + calculateQuestionMarks(q), 0);
    const actMarks = (sec.activities || []).reduce((actAcc, act) => {
      const actQMarks = (act.questions || []).reduce((qAcc, q) => qAcc + calculateQuestionMarks(q), 0);
      const clozeMarks = act.blanks ? act.blanks.reduce((acc, b) => acc + (Number(b.marks) || 1), 0) : 5;
      return actAcc + (act.marks || (act.activityType === 'cloze_activity' ? clozeMarks : actQMarks));
    }, 0);
    return secAcc + qMarks + actMarks;
  }, 0);
}

/**
 * Calculates total number of questions (counting subquestions & activities).
 */
export function calculateTotalQuestionCount(sections: ExamSection[]): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((secAcc, sec) => {
    const qCount = (sec.questions || []).reduce((qAcc, q) => {
      if (q.type === 'reading_comprehension' && Array.isArray(q.subQuestions) && q.subQuestions.length > 0) {
        return qAcc + q.subQuestions.length;
      }
      return qAcc + 1;
    }, 0);
    const actCount = (sec.activities || []).reduce((actAcc, act) => {
      if (act.activityType === 'cloze_activity') return actAcc + 1;
      return actAcc + (act.questions?.length || (act.pictureTaskType === 'write_paragraph' ? 1 : 0));
    }, 0);
    return secAcc + qCount + actCount;
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
  return (
    type === 'essay' ||
    type === 'paragraph' ||
    type === 'short_answer' ||
    type === 'coding_question' ||
    type === 'file_upload' ||
    type === 'picture_description' ||
    type === 'speaking'
  );
}

/**
 * Flattens all questions across sections and activities into a sequential array.
 */
export interface FlattenedExamQuestion {
  question: CanonicalQuestion;
  sectionId: string;
  sectionTitle: string;
  globalIndex: number; // 0-indexed
  displayNumber: number; // 1-indexed
  parentPassage?: string;
  parentPassageTitle?: string;
  parentAudioUrl?: string;
  parentVideoUrl?: string;
  parentImageUrl?: string;
  parentTranscript?: string;
  showTranscriptToStudents?: boolean;
  parentActivityTitle?: string;
  parentActivityType?: ActivityType;
  pictureTaskType?: PictureTaskType;
  rubric?: ActivityRubric;
}

export function flattenExamQuestions(sections: ExamSection[]): FlattenedExamQuestion[] {
  const result: FlattenedExamQuestion[] = [];
  let globalIndex = 0;

  (sections || []).forEach((sec) => {
    // 1. Standalone Section Questions
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

    // 2. Section Activities (Reading, Listening, Video, Picture Description)
    (sec.activities || []).forEach((act) => {
      if (Array.isArray(act.questions) && act.questions.length > 0) {
        act.questions.forEach((actQ) => {
          result.push({
            question: actQ,
            sectionId: sec.id,
            sectionTitle: sec.title,
            globalIndex,
            displayNumber: globalIndex + 1,
            parentPassage: act.passage,
            parentPassageTitle: act.title,
            parentAudioUrl: act.audioUrl,
            parentVideoUrl: act.videoUrl,
            parentImageUrl: act.imageUrl,
            parentTranscript: act.transcript,
            showTranscriptToStudents: act.showTranscriptToStudents,
            parentActivityTitle: act.title,
            parentActivityType: act.activityType,
            pictureTaskType: act.pictureTaskType,
            rubric: act.rubric
          });
          globalIndex++;
        });
      } else if (act.activityType === 'picture_description_activity') {
        // Standalone picture task with writing
        const pseudoQ: CanonicalQuestion = {
          id: `${act.id}_write`,
          type: 'paragraph',
          question: act.instructions || 'Describe the picture in detail or complete the written task based on the rubric.',
          difficulty: 'medium',
          marks: act.marks || 10,
          required: true
        } as any;

        result.push({
          question: pseudoQ,
          sectionId: sec.id,
          sectionTitle: sec.title,
          globalIndex,
          displayNumber: globalIndex + 1,
          parentImageUrl: act.imageUrl,
          parentActivityTitle: act.title,
          parentActivityType: act.activityType,
          pictureTaskType: act.pictureTaskType,
          rubric: act.rubric
        });
        globalIndex++;
      } else if (act.activityType === 'cloze_activity') {
        const clozeMarks = act.blanks ? act.blanks.reduce((acc, b) => acc + (Number(b.marks) || 1), 0) : 5;
        const pseudoQ: CanonicalQuestion = {
          id: `${act.id}_cloze`,
          type: 'cloze_passage',
          question: act.instructions || act.title || 'Complete the missing words in the passage.',
          passage: act.passage || '',
          blanks: act.blanks || [],
          wordBank: act.wordBank || [],
          difficulty: 'medium',
          marks: act.marks || clozeMarks,
          required: true
        } as any;

        result.push({
          question: pseudoQ,
          sectionId: sec.id,
          sectionTitle: sec.title,
          globalIndex,
          displayNumber: globalIndex + 1,
          parentPassage: act.passage,
          parentPassageTitle: act.title,
          parentActivityTitle: act.title,
          parentActivityType: act.activityType
        });
        globalIndex++;
      }
    });
  });

  return result;
}
