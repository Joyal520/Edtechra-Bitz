export type TaskCategory =
  | 'assignment'
  | 'lesson'
  | 'practice'
  | 'activity'
  | 'resource';

export type QuestionType =
  | 'mcq'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'multiple_select'
  | 'matching'
  | 'ordering'
  | 'numeric'
  | 'short_answer'
  | 'paragraph'
  | 'essay'
  | 'creative_writing'
  | 'open_ended';

export interface TaskContentBlock {
  id: string;
  type: 'introduction' | 'text' | 'explanation' | 'image' | 'video' | 'audio' | 'example' | 'vocabulary' | 'summary';
  title?: string;
  content: string;
  media_url?: string;
  caption?: string;
}

export interface TaskQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correct_answer?: any;
  accepted_answers?: string[];
  marks: number;
  explanation?: string;
  grading_mode?: 'deterministic' | 'ai';
  evaluation_rubric?: string;
}

export interface TaskSettings {
  show_result_immediately: boolean;
  show_correct_answers: boolean;
  allow_retry: boolean;
  enable_ai_feedback: boolean;
}

export interface ClassroomTask {
  id: string;
  classroom_id: string;
  created_by: string;
  title: string;
  subtitle?: string | null;
  instructions: string;
  category: TaskCategory;
  assignment_type?: string;
  points: number;
  due_date?: string | null;
  content_blocks: TaskContentBlock[];
  questions: TaskQuestion[];
  attachment_urls: any[];
  settings: TaskSettings;
  version: number;
  status: 'draft' | 'published' | 'closed' | 'deleted';
  created_at: string;
  updated_at: string;

  // Joined / aggregated stats
  creator?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  classroom?: {
    id: string;
    title: string;
    subject?: string;
    grade?: string;
  } | null;
  total_assigned?: number;
  submitted_count?: number;
  completed_count?: number;
  my_submission?: TaskSubmission | null;
}

export interface QuestionAnswerResult {
  question_id: string;
  student_answer: any;
  is_correct: boolean;
  score: number;
  max_score: number;
  grading_method: 'deterministic' | 'ai';
  feedback?: string;
  ai_score?: number;
  needs_teacher_review?: boolean;
}

export interface TaskSubmission {
  id: string;
  assignment_id: string;
  classroom_id: string;
  student_id: string;
  status: 'draft' | 'submitted' | 'graded' | 'returned' | 'resubmitted';
  text_response?: string;
  file_urls?: string[];
  question_answers: QuestionAnswerResult[];
  points_awarded?: number | null;
  final_score?: number | null;
  ai_score?: number | null;
  percentage?: number | null;
  is_ai_graded?: boolean;
  teacher_feedback?: string;
  teacher_adjusted?: boolean;
  teacher_adjustment_reason?: string | null;
  task_version?: number;
  submitted_at: string;
  completed_at?: string | null;
  updated_at: string;

  // Joined student profile
  student?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
}
