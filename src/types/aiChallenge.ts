export const AI_CHALLENGE_CATEGORIES = [
  'Creative Writing',
  'Paragraph Writing',
  'Essay Writing',
  'Story Writing',
  'Letter Writing',
  'ICT',
  'AI',
  'Science',
  'General Knowledge',
  'Life Skills',
  'Other'
];

export interface AiChallengeCriterion {
  name: string;
  max: number;
  score?: number;
  description?: string;
}

export interface AiChallengeEvaluationSpec {
  task_summary: string;
  instructions: string;
  required_word_count?: number | null;
  word_count_rule?: string | null;
  max_marks: number;
  requirements: string[];
  criteria: AiChallengeCriterion[];
}

export type AiChallengeStatus =
  | 'draft'
  | 'published'
  | 'open'
  | 'closed'
  | 'processing'
  | 'completed'
  | 'archived';

export type AiChallengeSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'teacher_review';

export interface AiChallenge {
  id: string;
  classroom_id: string;
  created_by: string;
  title: string;
  instructions: string;
  reference_file_key?: string | null;
  reference_file_name?: string | null;
  category: string;
  max_marks: number;
  allow_text_submission: boolean;
  allow_file_upload: boolean;
  required_word_count?: number | null;
  word_count_rule?: string | null;
  evaluation_spec_json: AiChallengeEvaluationSpec;
  status: AiChallengeStatus;
  deadline_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined / computed stats
  creator?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  total_participants?: number;
  submitted_count?: number;
  completed_count?: number;
  processing_count?: number;
  my_submission?: AiChallengeSubmission | null;
}

export interface AiChallengeSubmission {
  id: string;
  challenge_id: string;
  student_id: string;
  submission_type: 'text' | 'file';
  content_text?: string | null;
  file_key?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  word_count?: number | null;
  status: AiChallengeSubmissionStatus;
  submitted_at: string;
  queued_at?: string | null;
  processing_started_at?: string | null;
  processed_at?: string | null;
  expires_at?: string | null;
  file_deleted_at?: string | null;
  ai_score?: number | null;
  final_score?: number | null;
  percentage?: number | null;
  criteria_json?: AiChallengeCriterion[] | null;
  ai_feedback?: string | null;
  ai_original_score?: number | null;
  teacher_adjusted?: boolean;
  teacher_adjustment_reason?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;

  // Joined student profile
  student?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface AiChallengeLeaderboardEntry {
  rank: number;
  id: string;
  student_id: string;
  final_score: number;
  ai_score?: number | null;
  percentage: number;
  status: AiChallengeSubmissionStatus;
  submitted_at: string;
  teacher_adjusted?: boolean;
  student?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}
