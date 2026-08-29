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
  | 'image'
  | 'youtube_video'
  | 'youtube_short'
  | 'question_set'
  | 'audio'
  | 'callout'
  | 'code'
  | 'quote';

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'sentence_builder'
  | 'ordering'
  | 'short_answer';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type MasteryStatus = 'strong' | 'good' | 'needs_support' | 'at_risk';

// ----------------------------------------------------------------------------
// 1. CONTENT BLOCKS PAYLOADS
// ----------------------------------------------------------------------------

export interface TextBlockContent {
  text: string;
  markdown?: string;
  title?: string;
}

export interface ImageBlockContent {
  url: string;
  storage_key?: string;
  caption?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface YouTubeBlockContent {
  video_id: string;
  url: string;
  title?: string;
  is_short: boolean;
  start_seconds?: number;
}

export interface QuestionSetBlockContent {
  title?: string;
  question_ids?: string[];
  passing_score?: number;
}

export type BlockContent =
  | TextBlockContent
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
  options: string[] | Array<{ text: string; id?: string }>;
  correct_answer: string;
  explanation?: string;
  skill?: string;
  concept?: string;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
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

export interface CourseEpisode {
  id: string;
  unit_id: string;
  course_id: string;
  title: string;
  episode_type: EpisodeType;
  order_index: number;
  estimated_minutes: number;
  created_at?: string;
  updated_at?: string;

  // Joined relationships
  blocks?: CourseBlock[];
  questions?: CourseQuestion[];
  is_completed?: boolean;
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
  course_type: CourseType;
  status: CourseStatus;
  estimated_hours?: number;
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
