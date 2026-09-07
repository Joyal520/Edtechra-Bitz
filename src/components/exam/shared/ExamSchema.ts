// ============================================================================
// EDTECHRA DIGITAL ASSESSMENT PLATFORM: CANONICAL JSON SCHEMA (v2.0)
// Supports: Exams, Surveys, Google Forms Core Types & EdTechra Educational Types,
// Canva Themes, Brand Kits, and Conditional Branching Logic.
// ============================================================================

import { AssessmentThemeConfig } from './themePresets';

export type AssessmentType = 'exam' | 'survey';

export type SupportedQuestionType =
  // Google Forms Core Types
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'short_answer'
  | 'paragraph'
  | 'linear_scale'
  | 'grid_choice'
  | 'grid_checkbox'
  | 'date'
  | 'time'
  | 'file_upload'
  // EdTechra Educational & Language Types
  | 'true_false'
  | 'fill_in_blank'
  | 'matching'
  | 'reorder'
  | 'reading_comprehension'
  | 'image_question'
  | 'audio_question'
  | 'video_question'
  | 'coding_question'
  | 'sentence_builder'
  | 'sentence_completion'
  | 'sentence_transformation'
  | 'error_correction'
  | 'speaking'
  | 'interactive_activity'
  // Dedicated Activity Types
  | 'reading_activity'
  | 'listening_activity'
  | 'video_activity'
  | 'picture_description'
  | 'picture_description_activity'
  | 'cloze_activity'
  | 'cloze_passage'
  // Backward compatibility aliases
  | 'multiple_select'
  | 'essay';

export type ActivityType =
  | 'reading_activity'
  | 'listening_activity'
  | 'video_activity'
  | 'picture_description_activity'
  | 'cloze_activity';

export interface ActivityRubric {
  content?: number | string;
  vocabulary?: number | string;
  grammar?: number | string;
  organization?: number | string;
}

export type PictureTaskType =
  | 'describe'
  | 'answer_questions'
  | 'identify_objects'
  | 'write_paragraph'
  | 'infer_info';

export interface ExamActivity {
  id: string;
  activityType: ActivityType;
  title: string;
  instructions?: string;
  passage?: string; // Reading
  audioUrl?: string; // Listening
  videoUrl?: string; // Video
  imageUrl?: string; // Picture description
  transcript?: string; // Listening / Video
  showTranscriptToStudents?: boolean;
  pictureTaskType?: PictureTaskType;
  rubric?: ActivityRubric;
  questions: CanonicalQuestion[];
  blanks?: ClozeBlank[]; // Cloze activity
  wordBank?: string[]; // Cloze activity
  marks?: number;
}

export interface ExamBlueprintConfig {
  subject: string;
  grade: string;
  topic: string;
  examType: ExamType | string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  passPercentage: number;
  difficulty: ExamDifficulty;
  questionDistribution: {
    multipleChoice: number;
    trueFalse: number;
    fillInBlank: number;
    shortAnswer: number;
    reading: number;
    listening: number;
    writing: number;
    pictureDescription?: number;
  };
  skillWeighting: {
    recall: number;
    comprehension: number;
    application: number;
    analysis: number;
  };
  sourceContent?: string;
}

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
  | 'Survey'
  | 'Custom';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'General';

export type ScorePolicy = 'highest' | 'latest' | 'average';

export interface QuestionOption {
  id: string;
  text: string;
  skipToSectionId?: string; // Conditional branching jump target
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
  required?: boolean;
  skipToSectionId?: string;
  mediaUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  transcript?: string;
  showTranscriptToStudents?: boolean;
  pictureTaskType?: PictureTaskType;
  rubric?: ActivityRubric | string;
  shuffleOptions?: boolean;
  activityId?: string;
  activityType?: ActivityType;
}

// 1. Multiple Choice
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: QuestionOption[];
  correctAnswer: string[]; // Option ID(s) or option text
  shuffleOptions?: boolean;
}

// 2. Checkboxes (Multiple Select)
export interface CheckboxesQuestion extends BaseQuestion {
  type: 'checkboxes' | 'multiple_select';
  options: QuestionOption[];
  correctAnswer: string[];
  shuffleOptions?: boolean;
}
export type MultipleSelectQuestion = CheckboxesQuestion;

// 3. Dropdown
export interface DropdownQuestion extends BaseQuestion {
  type: 'dropdown';
  options: QuestionOption[];
  correctAnswer: string[];
}

// 4. Short Answer
export interface ShortAnswerQuestion extends BaseQuestion {
  type: 'short_answer';
  rubric?: string;
  sampleAnswer?: string;
  keywords?: string[];
  maxLength?: number;
}

// 5. Paragraph (Essay)
export interface ParagraphQuestion extends BaseQuestion {
  type: 'paragraph' | 'essay';
  minWords?: number;
  maxWords?: number;
  rubric?: string;
  sampleAnswer?: string;
}
export type EssayQuestion = ParagraphQuestion;

// 6. Linear Scale
export interface LinearScaleQuestion extends BaseQuestion {
  type: 'linear_scale';
  scaleMin: number; // usually 1
  scaleMax: number; // 5 or 10
  minLabel?: string; // e.g. "Poor"
  maxLabel?: string; // e.g. "Excellent"
  correctAnswer?: number;
}

// 7. Grid Choice (Multiple Choice Grid)
export interface GridChoiceQuestion extends BaseQuestion {
  type: 'grid_choice';
  rows: string[];
  columns: string[];
  correctAnswer?: Record<string, string>; // row -> column
}

// 8. Grid Checkbox (Checkbox Grid)
export interface GridCheckboxQuestion extends BaseQuestion {
  type: 'grid_checkbox';
  rows: string[];
  columns: string[];
  correctAnswer?: Record<string, string[]>; // row -> columns
}

// 9. Date Picker
export interface DateQuestion extends BaseQuestion {
  type: 'date';
  correctAnswer?: string; // YYYY-MM-DD
}

// 10. Time Picker
export interface TimeQuestion extends BaseQuestion {
  type: 'time';
  correctAnswer?: string; // HH:mm
}

// 11. File Upload
export interface FileUploadQuestion extends BaseQuestion {
  type: 'file_upload';
  maxSizeMB?: number;
  allowedTypes?: string[]; // e.g. ['pdf', 'image', 'document']
}

// 12. True / False
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correctAnswer: boolean | string;
}

// 13. Fill in the Blank
export interface FillInBlankQuestion extends BaseQuestion {
  type: 'fill_in_blank';
  acceptedAnswers: string[];
  caseSensitive?: boolean;
}

// 14. Matching
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: MatchingPair[];
}

// 15. Reorder
export interface ReorderQuestion extends BaseQuestion {
  type: 'reorder';
  items: ReorderItem[];
  correctOrder: string[];
}

// 16. Reading Comprehension
export interface ReadingComprehensionQuestion extends BaseQuestion {
  type: 'reading_comprehension';
  passageTitle?: string;
  passage: string;
  subQuestions: CanonicalQuestion[];
}

// 17. Image Question
export interface ImageQuestion extends BaseQuestion {
  type: 'image_question';
  imageUrl: string;
  caption?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

// 18. Audio Question
export interface AudioQuestion extends BaseQuestion {
  type: 'audio_question';
  audioUrl: string;
  transcript?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

// 19. Video Question
export interface VideoQuestion extends BaseQuestion {
  type: 'video_question';
  videoUrl: string;
  caption?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
}

// 20. Coding Question
export interface CodingQuestion extends BaseQuestion {
  type: 'coding_question';
  language: string; // 'python' | 'javascript' | 'html'
  starterCode?: string;
  solutionCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

// 21. Sentence Builder
export interface SentenceBuilderQuestion extends BaseQuestion {
  type: 'sentence_builder';
  wordPool: string[];
  targetSentence: string;
}

// 22. Cloze Passage
export interface ClozeBlank {
  id: string; // e.g. "blank_1" or "1"
  correctAnswer: string;
  acceptedAnswers?: string[];
  marks?: number;
}

export interface ClozePassageQuestion extends BaseQuestion {
  type: 'cloze_passage';
  passage: string;
  blanks: ClozeBlank[];
  wordBank?: string[];
}

export type CanonicalQuestion =
  | MultipleChoiceQuestion
  | CheckboxesQuestion
  | DropdownQuestion
  | ShortAnswerQuestion
  | ParagraphQuestion
  | LinearScaleQuestion
  | GridChoiceQuestion
  | GridCheckboxQuestion
  | DateQuestion
  | TimeQuestion
  | FileUploadQuestion
  | TrueFalseQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | ReorderQuestion
  | ReadingComprehensionQuestion
  | ImageQuestion
  | AudioQuestion
  | VideoQuestion
  | CodingQuestion
  | SentenceBuilderQuestion
  | ClozePassageQuestion;

export interface ExamSection {
  id: string;
  title: string;
  questionType?: SupportedQuestionType;
  description?: string;
  instructions?: string;
  passage?: string;
  skipToSectionId?: string; // Branching jump target
  questions: CanonicalQuestion[];
  activities?: ExamActivity[];
}

export interface BrandKitConfig {
  enabled: boolean;
  logoUrl?: string;
  institutionName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  watermark?: boolean;
  footerText?: string;
}

export interface SurveySettings {
  isAnonymous: boolean;
  collectEmail: boolean;
  oneResponsePerUser: boolean;
  thankYouMessage?: string;
  redirectUrl?: string;
  confirmationBadgeText?: string;
}

export interface ExamMetadata {
  title: string;
  subject: string;
  grade: string;
  level?: CEFRLevel | string;
  examType: ExamType | string;
  difficulty: ExamDifficulty;
  topic?: string;
  totalMarks?: number;
  description?: string;
  instructions?: string;
  coverImageUrl?: string;
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

export interface CanonicalAssessmentV2 {
  schemaVersion: '2.0' | '1.0';
  assessmentType: AssessmentType;
  exam: ExamMetadata;
  requirements?: PedagogicalRequirements;
  theme?: AssessmentThemeConfig;
  brandKit?: BrandKitConfig;
  surveySettings?: SurveySettings;
  sections: ExamSection[];
}

// Backward compatibility type alias
export type CanonicalExamV1 = CanonicalAssessmentV2;
export type CanonicalExamV2 = CanonicalAssessmentV2;
