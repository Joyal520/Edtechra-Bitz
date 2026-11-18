// ============================================================================
// EDTECHRA COURSE STUDIO: GAMES & COMPETITIONS TYPE DEFINITIONS
// ============================================================================

export type CourseGameMode = 'learning_game' | 'competition';
export type CompetitionFormat = 'individual' | 'team' | 'live_quiz';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type CourseGameStatus = 'draft' | 'published' | 'archived';

export type CourseGameQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'word_arrangement'
  | 'image_based'
  | 'short_answer'
  | 'correct_mistake';

export const COURSE_GAME_QUESTION_TYPE_LABELS: Record<CourseGameQuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True or False',
  fill_blank: 'Fill in the Blanks',
  matching: 'Matching',
  word_arrangement: 'Word Arrangement',
  image_based: 'Image-Based Question',
  short_answer: 'Short Answer',
  correct_mistake: 'Correct the Mistake'
};

export interface CourseGameSourceMaterial {
  id: string;
  source_type: 'course_lesson' | 'library' | 'upload';
  title: string;
  course_id?: string;
  unit_id?: string;
  episode_id?: string;
  library_resource_id?: string;
  file_url?: string;
  file_type?: string;
  subject?: string;
  attribution?: string;
  extracted_text?: string;
}

export interface CourseGameScoringConfig {
  points_per_question: number;
  bonus_points: number;
  time_based_scoring: boolean;
  difficulty_based_scoring: boolean;
  negative_marking: boolean;
  negative_points: number;
  total_points: number;
}

export interface CourseGameSettings {
  time_limit_sec: number;
  max_attempts: number;
  show_explanations: boolean;
  immediate_feedback: boolean;
  shuffle_questions: boolean;
  public_leaderboard: boolean;
  visibility: 'classroom' | 'selected_students' | 'public';
  team_names?: string[];
}

export interface MatchingPair {
  left: string;
  right: string;
}

export interface CourseGameQuestion {
  id: string;
  game_id?: string;
  order_index: number;
  question_type: CourseGameQuestionType;
  question_text: string;
  options: any; // string[] for MCQ/Image/WordArrangement, MatchingPair[] for matching
  correct_answer?: any; // Omitted on student play payloads until submission
  explanation?: string;
  points: number;
  difficulty: GameDifficulty;
  image_url?: string | null;
  source_ref?: string | null;
}

export interface CourseGame {
  id: string;
  course_id?: string | null;
  teacher_id: string;
  title: string;
  description: string;
  mode: CourseGameMode;
  competition_format: CompetitionFormat;
  difficulty: GameDifficulty;
  topic: string;
  target_level: string;
  source_materials: CourseGameSourceMaterial[];
  scoring_config: CourseGameScoringConfig;
  settings: CourseGameSettings;
  status: CourseGameStatus;
  total_questions: number;
  total_points: number;
  created_at: string;
  updated_at: string;
  course?: { id: string; title: string; subject?: string } | null;
  teacher?: { id: string; full_name?: string; email?: string } | null;
  questions?: CourseGameQuestion[];
  assignments?: CourseGameAssignment[];
}

export interface CourseGameAssignment {
  id: string;
  game_id: string;
  classroom_id: string;
  assignment_id?: string | null;
  assigned_by: string;
  participant_ids: string[];
  start_date?: string | null;
  end_date?: string | null;
  time_limit_sec: number;
  max_attempts: number;
  visibility: 'classroom' | 'selected_students' | 'public';
  public_leaderboard: boolean;
  live_quiz_id?: string | null;
  live_session_id?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  classroom?: { id: string; title?: string; name?: string } | null;
}

export interface CourseGameAnswerResult {
  question_id: string;
  submitted_answer: any;
  is_correct: boolean;
  correct_answer: any;
  explanation: string;
  points_earned: number;
  max_points: number;
}

export interface CourseGameAttempt {
  id: string;
  game_id: string;
  game_assignment_id: string;
  classroom_id: string;
  student_id: string;
  attempt_number: number;
  team_name?: string | null;
  answers: CourseGameAnswerResult[];
  score: number;
  max_score: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_pct: number;
  time_taken_sec: number;
  badges_earned: string[];
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
}

export interface CourseGameAnalytics {
  game_id: string;
  game_title: string;
  total_assigned_students: number;
  total_participants: number;
  completion_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  max_possible_score: number;
  question_performance: {
    question_id: string;
    order_index: number;
    question_text: string;
    question_type: CourseGameQuestionType;
    total_attempts: number;
    correct_count: number;
    incorrect_count: number;
    accuracy_pct: number;
  }[];
  most_incorrect_questions: {
    question_id: string;
    question_text: string;
    incorrect_count: number;
    accuracy_pct: number;
  }[];
  students_needing_support: {
    student_id: string;
    full_name: string;
    best_score: number;
    max_score: number;
    accuracy_pct: number;
    attempts_count: number;
  }[];
  leaderboard: {
    student_id: string;
    full_name: string;
    team_name?: string | null;
    best_score: number;
    accuracy_pct: number;
    time_taken_sec: number;
  }[];
}
