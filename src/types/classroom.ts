// ============================================================================
// EDTECHRA-BITZ: Classroom & Classes Type Definitions
// ============================================================================

export type ClassroomRole = 'teacher' | 'co-teacher' | 'student';
export type MemberStatus = 'active' | 'invited' | 'removed' | 'blocked';
export type AssignmentType = 'task' | 'quiz' | 'exam' | 'competition' | 'activity_spree';
export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'deleted';
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned' | 'resubmitted';
export type ExamStatus = 'draft' | 'scheduled' | 'published' | 'active' | 'closed';
export type BucketItemType = 'lesson' | 'worksheet' | 'video' | 'reading' | 'quiz' | 'document' | 'link';

export type ClassroomTheme = 'theme-blue' | 'theme-purple' | 'theme-green' | 'theme-amber' | 'theme-rose' | 'theme-teal';

export interface Classroom {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  grade: string;
  theme?: ClassroomTheme | string;
  description?: string;
  banner_url?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed / Joined fields
  teacher?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  student_count?: number;
  assignment_count?: number;
  active_submission_count?: number;
  average_completion?: number;
  user_role?: ClassroomRole;
}

export interface ClassroomMember {
  id: string;
  classroom_id: string;
  profile_id: string;
  role: ClassroomRole;
  display_name?: string | null;
  joined_at: string;
  status: MemberStatus;
  
  // Joined profile
  profile?: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role: string;
  };
  points?: number;
  completed_assignments?: number;
}

export interface ClassroomInvite {
  id: string;
  classroom_id: string;
  invite_code: string;
  created_by: string;
  max_uses: number;
  uses_count: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AssignmentAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  instructions: string;
  assignment_type: AssignmentType;
  points: number;
  due_date?: string | null;
  attachment_urls: AssignmentAttachment[];
  created_by: string;
  status: AssignmentStatus;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined/Computed fields
  submission_count?: number;
  graded_count?: number;
  my_submission?: AssignmentSubmission | null;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  classroom_id: string;
  student_id: string;
  status: SubmissionStatus;
  text_response: string;
  file_urls: AssignmentAttachment[];
  points_awarded?: number | null;
  teacher_feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  submitted_at: string;
  updated_at: string;

  // Joined student info
  student?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
}

export interface ClassroomPoint {
  id: string;
  classroom_id: string;
  student_id: string;
  points: number;
  reason: string;
  source_type: 'assignment' | 'quiz' | 'exam' | 'spree' | 'activity' | 'manual' | 'bonus' | 'live_quiz';
  source_id?: string | null;
  awarded_by?: string | null;
  created_at: string;
}

export interface ClassroomLeaderboardEntry {
  student_id: string;
  name: string;
  avatar_url?: string | null;
  points: number;
  rank: number;
  assignments_completed: number;
}

export interface ClassroomMessage {
  id: string;
  classroom_id: string;
  teacher_id: string;
  message: string;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined teacher info
  teacher?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface ContentBucket {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  items?: BucketItem[];
}

export interface BucketItem {
  id: string;
  bucket_id: string;
  classroom_id: string;
  title: string;
  item_type: BucketItemType;
  content_id?: string | null;
  content_url?: string | null;
  thumbnail_url?: string | null;
  sort_order: number;
  created_at: string;
}

export interface ClassroomExamQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correct_option_id: string;
  marks: number;
  explanation?: string;
}

export interface ClassroomExam {
  id: string;
  classroom_id: string;
  title: string;
  description?: string;
  instructions?: string;
  duration_minutes: number;
  total_marks: number;
  pass_marks: number;
  starts_at?: string | null;
  ends_at?: string | null;
  status: ExamStatus;
  questions: ClassroomExamQuestion[];
  created_by: string;
  created_at: string;
  updated_at: string;

  // Student specific
  latest_result?: ClassroomExamResult | null;
  can_start?: boolean;
}

export interface ClassroomExamResult {
  id: string;
  exam_id: string;
  classroom_id: string;
  student_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>; // questionId -> selectedOptionId
  feedback?: string | null;
  started_at?: string;
  submitted_at: string;

  student?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface ClassroomStats {
  total_students: number;
  total_assignments: number;
  total_submissions: number;
  average_completion_percent: number;
  average_score: number;
}
