// ============================================================================
// EDTECHRA-BITZ: Live Quiz Realtime Types
// ============================================================================

export type LiveQuizDifficulty = 'Easy' | 'Medium' | 'Hard';
export type LiveQuizSessionStatus = 'lobby' | 'in_progress' | 'reveal' | 'finished' | 'cancelled';

export interface LiveQuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string] | string[];
  correctIndex?: number; // Omitted in student payloads and student RPC queries
  durationSec?: number;
  explanation?: string;
}

export type LiveQuizStudentQuestion = Omit<LiveQuizQuestion, 'correctIndex'>;

export interface LiveQuiz {
  id: string;
  classroom_id?: string | null;
  title: string;
  description?: string;
  category: string;
  difficulty: LiveQuizDifficulty;
  accent_color?: string;
  questions: LiveQuizQuestion[];
  is_public: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveQuizSession {
  id: string;
  classroom_id: string;
  teacher_id: string;
  quiz_id?: string | null;
  pin: string;
  status: LiveQuizSessionStatus;
  current_question_index: number;
  question_start_ms?: number | null;
  question_duration_sec: number;
  correct_answer_index?: number | null;
  created_at: string;
  ended_at?: string | null;

  // Joined
  quiz?: LiveQuiz | null;
  classroom?: {
    id: string;
    title: string;
    subject: string;
  } | null;
  teacher?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  participant_count?: number;
}

export interface LiveQuizParticipant {
  id: string;
  session_id: string;
  student_id: string;
  display_name: string;
  avatar_url?: string | null;
  score: number;
  last_earned_points: number;
  final_rank?: number | null;
  joined_at: string;
}

export interface LiveQuizAnswer {
  id: string;
  session_id: string;
  question_index: number;
  student_id: string;
  selected_option_index: number;
  is_correct: boolean;
  points_awarded: number;
  client_submit_ms: number;
  submitted_at: string;
}

export interface LiveQuizResult {
  id: string;
  session_id: string;
  classroom_id?: string | null;
  teacher_id?: string | null;
  student_id: string;
  quiz_id?: string | null;
  score: number;
  points_awarded: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  accuracy_percentage: number;
  final_rank?: number | null;
  created_at: string;

  // Joined
  student?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
}

export interface LiveQuizBroadcastEvent {
  type: 'quiz_started' | 'question_started' | 'question_reveal' | 'quiz_finished';
  payload: any;
}
