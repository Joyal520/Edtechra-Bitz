// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO TYPE DEFINITIONS
// Complete type system for Teacher Course Studio, Multi-Classroom Delivery,
// Content Blocks, Question Sets, and Cross-Classroom Analytics.
// ============================================================================

export type CourseType = 'full' | 'quick';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type EpisodeType = 'lesson' | 'practice' | 'assessment' | 'revision';

export type BlockType =
  | 'text'
  | 'heading'
  | 'text_image'
  | 'text_video'
  | 'image'
  | 'video'
  | 'youtube_video'
  | 'youtube_short'
  | 'question_set'
  | 'audio'
  | 'callout'
  | 'code'
  | 'quote'
  | 'list'
  | 'divider'
  | 'interactive_question';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'yes_no'
  | 'fill_blank'
  | 'multiple_fill_blanks'
  | 'matching'
  | 'matching_pairs'
  | 'sentence_builder'
  | 'sentence_reordering'
  | 'word_ordering'
  | 'ordering'
  | 'story_sequence'
  | 'image_selection'
  | 'dropdown_selection'
  | 'drag_to_complete'
  | 'drag_drop_matching'
  | 'categorisation'
  | 'odd_one_out'
  | 'short_answer'
  | 'cloze_passage'
  | 'essay'
  | 'comprehension';

export type ComprehensionType =
  | 'literal'
  | 'main_idea'
  | 'detail'
  | 'wh_question'
  | 'vocab_context'
  | 'meaning_context'
  | 'reference'
  | 'inference'
  | 'cause_effect'
  | 'compare_contrast'
  | 'sequence'
  | 'author_purpose'
  | 'evidence_based'
  | 'short_answer'
  | 'explain'
  | 'summarize';

export interface ComprehensionMetadata {
  comprehension_type?: ComprehensionType;
  passage_ref?: string;
  passage_text?: string;
  evidence_quote?: string;
  reference_target?: string;
}

export interface OpenEndedRubricCriterion {
  name: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface StudentQuestionResponse {
  questionId: string;
  answer: any;
  status: 'unanswered' | 'evaluating' | 'correct' | 'incorrect';
  score: number;
  maxScore: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  criteria?: OpenEndedRubricCriterion[];
  evaluatedAt?: string;
}

export interface StudentAttemptSession {
  episodeId: string;
  responses: Record<string, StudentQuestionResponse>;
  totalScore: number;
  maxPossibleScore: number;
  isComplete: boolean;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type MasteryStatus = 'strong' | 'good' | 'needs_support' | 'at_risk';

export interface ClozeBlank {
  id: string;
  answer: string;
  options: string[]; // exactly 4 options (1 correct, 3 distractors)
}

export interface ClozePassageData {
  passage: string;
  blanks: ClozeBlank[];
}

export type EssayEvaluationCriteriaType =
  | 'content_accuracy'
  | 'relevance'
  | 'completeness'
  | 'language'
  | 'grammar'
  | 'vocabulary';

export interface EssayConfig {
  image_url?: string;
  min_words?: number;
  max_words?: number;
  evaluation_criteria?: (EssayEvaluationCriteriaType | string)[];
}

export interface EssayEvaluationResult {
  score: number;
  max_score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  criteria_scores: Record<string, number>;
  ai_provider?: 'gemini' | 'openai_fallback' | 'deterministic_evaluator';
  model?: string;
}

// ----------------------------------------------------------------------------
// 1. CONTENT BLOCKS PAYLOADS
// ----------------------------------------------------------------------------

export interface TextBlockContent {
  text: string;
  markdown?: string;
  title?: string;
}

export interface TextImageBlockContent {
  title?: string;
  text: string;
  image?: {
    url: string;
    storage_key?: string;
    caption?: string;
    alt?: string;
    position: 'left' | 'right' | 'above' | 'below';
    size: 'small' | 'medium' | 'large';
    width?: number;
    height?: number;
  };
}

export interface TextVideoBlockContent {
  title?: string;
  text: string;
  video?: {
    url: string;
    video_id?: string;
    title?: string;
    is_short?: boolean;
    position: 'left' | 'right' | 'above' | 'below';
    size?: 'medium' | 'large';
  };
}

export interface ImageBlockContent {
  url: string;
  storage_key?: string;
  caption?: string;
  alt?: string;
  width?: number;
  height?: number;
  position?: 'left' | 'right' | 'center';
  size?: 'small' | 'medium' | 'large';
}

export interface YouTubeBlockContent {
  video_id: string;
  url: string;
  title?: string;
  is_short: boolean;
  start_seconds?: number;
  position?: 'left' | 'right' | 'center';
}

export interface QuestionSetBlockContent {
  title?: string;
  question_ids?: string[];
  passing_score?: number;
}

export type BlockContent =
  | TextBlockContent
  | TextImageBlockContent
  | TextVideoBlockContent
  | ImageBlockContent
  | YouTubeBlockContent
  | QuestionSetBlockContent
  | Record<string, any>;

// ----------------------------------------------------------------------------
// 2. CORE COURSE ENTITIES
// ----------------------------------------------------------------------------

export interface CourseQuestion {
  id: string;
  episode_id: string;
  course_id: string;
  block_id?: string | null;
  question_text: string;
  question_type: QuestionType;
  options: string[] | Array<{ text: string; id?: string }> | Record<string, any>;
  correct_answer: string;
  explanation?: string;
  skill?: string;
  concept?: string;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  passage?: string;
  blanks?: ClozeBlank[];
  image_url?: string;
  min_words?: number;
  max_words?: number;
  evaluation_criteria?: string[];
  essay_result?: EssayEvaluationResult;
  comprehension_metadata?: ComprehensionMetadata;
  content_ref?: string;
  rubric?: OpenEndedRubricCriterion[];
  keywords?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CourseBlock {
  id: string;
  episode_id: string;
  course_id: string;
  block_type: BlockType;
  order_index: number;
  content: BlockContent;
  created_at?: string;
  updated_at?: string;
}

export type LessonProgressionStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface CourseEpisode {
  id: string;
  unit_id: string;
  course_id: string;
  title: string;
  episode_type: EpisodeType;
  order_index: number;
  position?: number;
  estimated_minutes: number;
  daily_release_enabled?: boolean;
  release_day?: number;
  is_manually_unlocked?: boolean;
  created_at?: string;
  updated_at?: string;

  // Joined relationships & computed progression
  blocks?: CourseBlock[];
  questions?: CourseQuestion[];
  is_completed?: boolean;
  progression_status?: LessonProgressionStatus;
  unlock_message?: string;
}

export interface CourseUnit {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;

  // Joined relationships
  episodes?: CourseEpisode[];
}

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  short_description: string;
  subject: string;
  grade_level: string;
  cover_image_url?: string | null;
  cover_image_key?: string | null;
  cover_aspect_ratio?: '1:1' | '16:9';
  course_type: CourseType;
  status: CourseStatus;
  estimated_hours?: number;
  daily_release_enabled?: boolean;
  course_timezone?: string;
  course_start_date?: string;
  created_at: string;
  updated_at: string;

  // Computed / Joined fields
  units_count?: number;
  episodes_count?: number;
  assigned_classrooms_count?: number;
  enrolled_students_count?: number;
  units?: CourseUnit[];
  teacher?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export interface RoadmapLessonItem {
  id: string;
  unit_id: string;
  unit_title: string;
  unit_index: number;
  title: string;
  position: number;
  order_index: number;
  estimated_minutes: number;
  status: LessonProgressionStatus;
  release_day: number;
  is_locked: boolean;
  unlock_message?: string;
  release_date_str?: string;
  score?: number;
  max_score?: number;
  completed_at?: string;
  questions_count?: number;
}

// ----------------------------------------------------------------------------
// 3. CLASSROOM ASSIGNMENT & ENROLLMENT
// ----------------------------------------------------------------------------

export interface CourseAssignmentSettings {
  sequential_unlock: boolean;
  allow_retries: boolean;
  track_mastery: boolean;
  award_points: boolean;
}

export interface CourseClassroomAssignment {
  id: string;
  course_id: string;
  classroom_id: string;
  assigned_by: string;
  start_date?: string | null;
  due_date?: string | null;
  status: 'active' | 'paused' | 'archived' | 'completed';
  settings: CourseAssignmentSettings;
  assigned_at: string;
  updated_at: string;

  // Joined classroom data
  classroom?: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    student_count?: number;
  };
  course?: Course;
  enrollment?: CourseEnrollment;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  classroom_id: string;
  classroom_assignment_id: string;
  student_id: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  progress_percent: number;
  mastery_percent: number;
  accuracy_percent: number;
  current_episode_id?: string | null;
  completed_episodes_count: number;
  total_episodes_count: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  enrolled_at?: string | null;
  last_activity_at: string;

  // Joined student data
  student?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export interface CourseEpisodeProgress {
  id: string;
  enrollment_id: string;
  student_id: string;
  course_id: string;
  classroom_id: string;
  episode_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number;
  max_score: number;
  percentage: number;
  time_spent_seconds: number;
  completed_at?: string | null;
}

export interface CourseQuestionAttempt {
  id: string;
  enrollment_id: string;
  student_id: string;
  course_id: string;
  classroom_id: string;
  episode_id: string;
  question_id: string;
  student_answer: string;
  is_correct: boolean;
  points_awarded: number;
  attempt_number: number;
  skill?: string;
  concept?: string;
  difficulty?: DifficultyLevel;
  answered_at: string;
}

// ----------------------------------------------------------------------------
// 4. COURSE ANALYTICS & MASTERY
// ----------------------------------------------------------------------------

export interface ConceptMasteryItem {
  concept: string;
  skill: string;
  accuracy_percentage: number;
  total_attempts: number;
  correct_attempts: number;
  status: MasteryStatus;
}

export interface ClassroomCoursePerformance {
  classroom_id: string;
  classroom_title: string;
  grade: string;
  enrolled_students: number;
  average_progress_percent: number;
  average_mastery_percent: number;
  average_accuracy_percent: number;
  completion_rate_percent: number;
}

export interface StudentCoursePerformance {
  student_id: string;
  student_name: string;
  student_email: string;
  avatar_url?: string | null;
  classroom_id: string;
  classroom_title: string;
  progress_percent: number;
  mastery_percent: number;
  accuracy_percent: number;
  status: MasteryStatus;
  last_active_at: string;
  weak_concepts: string[];
  strong_concepts: string[];
}

export interface CourseAnalyticsSummary {
  course: Course;
  overview: {
    total_assigned_classrooms: number;
    total_enrolled_students: number;
    active_students_count: number;
    average_progress_percent: number;
    average_mastery_percent: number;
    average_accuracy_percent: number;
    overall_completion_rate: number;
  };
  classroom_performance: ClassroomCoursePerformance[];
  student_performance: StudentCoursePerformance[];
  concept_mastery: ConceptMasteryItem[];
  ai_insights: {
    summary: string;
    class_strengths: string[];
    critical_struggles: string[];
    recommended_action: string;
  };
}

// ----------------------------------------------------------------------------
// 5. AI GENERATION & STUDIO UTILITIES
// ----------------------------------------------------------------------------

export interface AILessonGenerationPayload {
  course_id: string;
  course_title?: string;
  unit_title?: string;
  episode_title?: string;
  raw_material: string;
  subject?: string;
  grade_level?: string;
}

export interface AILessonGenerationResponse {
  title: string;
  summary: string;
  blocks: Array<{
    block_type: BlockType;
    content: BlockContent;
  }>;
  suggested_questions?: Array<{
    question_text: string;
    question_type: QuestionType;
    options: string[];
    correct_answer: string;
    explanation: string;
    skill: string;
    concept: string;
    difficulty: DifficultyLevel;
  }>;
}

export interface AIQuestionGenerationPayload {
  course_id: string;
  episode_id?: string;
  scope: 'episode' | 'unit' | 'course';
  content_text: string;
  question_types: QuestionType[];
  question_count: number;
  difficulty: DifficultyLevel;
  target_grade?: string;
  subject?: string;
  instructions?: string;
}

export interface AIQuestionGenerationResponse {
  questions: Array<{
    question_text: string;
    question_type: QuestionType;
    options: string[];
    correct_answer: string;
    explanation: string;
    skill: string;
    concept: string;
    difficulty: DifficultyLevel;
    points: number;
  }>;
}

export interface AICoursePlanEpisode {
  title: string;
  objective: string;
  can_do?: string;
  focus_skills?: string[];
}

export interface AICoursePlanUnit {
  title: string;
  description: string;
  episodes: AICoursePlanEpisode[];
}

export interface AICoursePlanPayload {
  prompt: string;
  target_level?: string;
  age_group?: string;
  units_count?: number;
  lessons_per_unit?: number;
  learning_styles?: string[];
  subject?: string;
}

export interface AICoursePlanResponse {
  title: string;
  short_description: string;
  subject: string;
  grade_level: string;
  target_level?: string;
  age_group?: string;
  units: AICoursePlanUnit[];
}

export interface AIStructuredLessonPayload {
  course_title: string;
  unit_title: string;
  lesson_title: string;
  target_level?: string;
  objective?: string;
  subject?: string;
  instructions?: string;
}

export interface AIStructuredLessonResponse {
  title: string;
  summary: string;
  can_do?: string;
  estimated_minutes?: number;
  blocks: Array<{
    block_type: BlockType;
    content: BlockContent;
  }>;
  suggested_questions?: Array<{
    question_text: string;
    question_type: QuestionType;
    options: string[];
    correct_answer: string;
    explanation: string;
    skill: string;
    concept: string;
    difficulty: DifficultyLevel;
    points: number;
  }>;
}

