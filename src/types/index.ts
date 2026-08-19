export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type ContentStatus = 'draft' | 'published' | 'archived' | 'upcoming';

export interface VocabularyWord {
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  definition: string;
  example: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctIndex?: number;
  explanation: string;
  type?: 'mcq' | 'true_false' | 'vocab' | 'fill_blank';
}

export interface YouTubeVideo {
  id: string;
  youtube_video_id: string;
  channel_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  youtube_url: string;
  published_at: string;
  duration_seconds: number;
  duration_formatted?: string;
  is_short: boolean;
  view_count: number;
  like_count: number;
  category: string;
  difficulty?: Difficulty;
  status?: ContentStatus;
  learning_content?: YouTubeLearningContent;
}

export interface YouTubeLearningContent {
  id?: string;
  youtube_video_id: string;
  summary: string;
  key_takeaway?: string;
  vocabulary: VocabularyWord[];
  quiz: QuizQuestion[];
  learning_objectives?: string[];
  status: ContentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserLearningProgress {
  id?: string;
  user_id: string;
  youtube_video_id: string;
  watched: boolean;
  watch_progress: number;
  quiz_completed: boolean;
  quiz_score: number;
  quiz_total: number;
  completed: boolean;
  last_watched_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

export interface CategoryProgress {
  category: string;
  displayTitle: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  color: string;
  order?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
  name?: string; // UI alias
  avatar_url?: string | null;
  avatarUrl?: string; // UI alias
  role: 'student' | 'admin';
  created_at: string;
  updated_at?: string;
  totalXp?: number;
  currentLevel?: number;
  streakDays?: number;
  completedLessonsCount?: number;
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'admin';
  created_at: string;
  last_sign_in_at?: string | null;
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthModalMode = 'login' | 'signup' | 'forgot_password' | 'name_prompt' | 'oauth_error' | 'reset_password';

export type AuthIntent =
  | { type: 'navigate'; path: string }
  | { type: 'action'; action: 'upload' | string; payload?: any }
  | null;

