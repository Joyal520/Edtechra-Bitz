// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: CANONICAL JSON SCHEMA (v1.0)
// ============================================================================

export type SupportedQuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'fill_in_blank'
  | 'matching'
  | 'reorder'
  | 'short_answer'
  | 'essay'
  | 'reading_comprehension'
  | 'image_question'
  | 'audio_question';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export type ExamDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';

export type ExamType =
  | 'Unit Test'
  | 'Mid Term'
  | 'Final Exam'
  | 'Practice Test'
  | 'Quiz'
  | 'Assignment'
  | 'Diagnostic Test'
  | 'Mock Exam'
  | 'Custom';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'General';

export type ScorePolicy = 'highest' | 'latest' | 'average';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface MatchingPair {
  id?: string;
  left: string;
  right: string;
}

export interface ReorderItem {
  id: string;
  text: string;
}

export interface BaseQuestion {
  id: string;
  type: SupportedQuestionType;
  question: string;
  difficulty: QuestionDifficulty;
  marks: number;
  explanation?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: QuestionOption[];
  correctAnswer: string[]; // Option ID(s) or option text
}

export interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple_select';
  options: QuestionOption[];
  correctAnswer: string[]; // Multiple correct Option IDs
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctAnswer: boolean | string; // true/false or "True"/"False"
}

export interface FillInBlankQuestion extends BaseQuestion {
  type: 'fill_in_blank';
  acceptedAnswers: string[];
  caseSensitive?: boolean;
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: MatchingPair[];
}

export interface ReorderQuestion extends BaseQuestion {
  type: 'reorder';
  items: ReorderItem[];
  correctOrder: string[]; // Array of item IDs in correct sequence
}

export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  rubric?: string;
  sampleAnswer?: string;
  keywords?: string[];
}

export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  minWords?: number;
  maxWords?: number;
  rubric?: string;
  sampleAnswer?: string;
}

export interface ReadingComprehensionQuestion extends BaseQuestion {
  type: 'reading_comprehension';
  passageTitle?: string;
  passage: string;
  subQuestions: CanonicalQuestion[];
}

export interface ImageQuestion extends BaseQuestion {
  type: 'image_question';
  imageUrl: string;
  caption?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

export interface AudioQuestion extends BaseQuestion {
  type: 'audio_question';
  audioUrl: string;
  transcript?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

export type CanonicalQuestion =
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | TrueFalseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | ReorderQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | ReadingComprehensionQuestion
  | ImageQuestion
  | AudioQuestion;

export interface ExamSection {
  id: string;
  title: string;
  questionType?: SupportedQuestionType;
  description?: string;
  instructions?: string;
  passage?: string;
  questions: CanonicalQuestion[];
}

export interface ExamMetadata {
  title: string;
  subject: string;
  grade: string;
  level?: CEFRLevel | string;
  examType: ExamType | string;
  difficulty: ExamDifficulty;
  topic?: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  passPercentage: number;
  maxAttempts?: number;
  scorePolicy?: ScorePolicy;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  allowLateSubmission?: boolean;
  showMarksImmediately?: boolean;
  showCorrectAnswers?: boolean;
  password?: string;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PedagogicalRequirements {
  learningObjectives?: string[];
  skillsTested?: string[];
  vocabularyLevel?: string;
  grammarFocus?: string;
  topicsToInclude?: string[];
  topicsToAvoid?: string[];
  specialInstructions?: string;
  cefrLevel?: CEFRLevel;
}

export interface CanonicalExamV1 {
  schemaVersion: '1.0';
  exam: ExamMetadata;
  requirements?: PedagogicalRequirements;
  sections: ExamSection[];
}
