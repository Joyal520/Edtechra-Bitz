export type { PresignedUploadResponse, StudentPost, PostAuthor } from './post';

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
  text_size?: 'small' | 'medium' | 'large' | 'extra-large' | string;
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

// ============================================================================
// Interactive Quiz Bits Types
// ============================================================================

export interface QuizBit {
  id: string;
  question: string;
  options: string[];
  correct_answer?: string; // May be omitted in student feed payloads for extra security
  explanation: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  xp: number;
  is_published: boolean;
  created_by?: string | null;
  import_batch_id?: string | null;
  created_at: string;
  updated_at?: string;
  // Metadata for admin / student views
  attempt_count?: number;
  has_completed?: boolean;
}

export interface RawQuizInput {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  xp: number;
}

export interface QuizAttemptResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_awarded: number;
  already_attempted: boolean;
}

export interface QuizValidationErrorItem {
  index: number;
  question: string;
  errors: string[];
}

export interface QuizValidationResult {
  valid: RawQuizInput[];
  invalid: QuizValidationErrorItem[];
  totalDetected: number;
}

export interface QuizImportResult {
  importedCount: number;
  failedCount: number;
  batchId: string;
  quizzes: QuizBit[];
  errors?: QuizValidationErrorItem[];
}

export interface QuizAdminStats {
  totalQuizzes: number;
  publishedQuizzes: number;
  unpublishedQuizzes: number;
  totalAttempts: number;
  totalXpAwarded: number;
  totalBatches: number;
}

// ============================================================================
// YouTube Shorts Types
// ============================================================================

export interface YouTubeShort {
  id: string;
  youtube_video_id: string;
  youtube_url: string;
  title: string;
  description?: string | null;
  thumbnail_url: string;
  category: string;
  duration: number; // in seconds (default 30)
  duration_formatted?: string;
  is_published: boolean;
  sort_order: number;
  linked_quiz_id?: string | null;
  linked_quiz?: QuizBit | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateYouTubeShortInput {
  youtube_url: string;
  title: string;
  description?: string;
  category?: string;
  duration?: number;
  linked_quiz_id?: string | null;
  is_published?: boolean;
}

export interface YouTubeShortAdminStats {
  totalShorts: number;
  publishedShorts: number;
  draftShorts: number;
  linkedQuizShorts: number;
}

// ============================================================================
// One-Minute Reading Types
// ============================================================================

export interface ReadingParagraph {
  id: number;
  text: string;
}

export interface ReadingVocabulary {
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  definition: string;
  example?: string;
}

export interface ReadingQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface ReadingBit {
  id: string;
  title: string;
  subtitle?: string | null;
  category: string;
  level: string; // e.g. 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  reading_time: number; // in minutes (default 1)
  paragraphs: ReadingParagraph[];
  vocabulary?: ReadingVocabulary[];
  questions?: ReadingQuestion[];
  cover_image_url?: string | null;
  cover_image_object_key?: string | null;
  is_published: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  has_completed?: boolean;
}

export interface RawReadingInput {
  type?: 'reading';
  title: string;
  subtitle?: string;
  category?: string;
  level?: string;
  reading_time?: number;
  paragraphs: Array<{ id?: number; text: string }>;
  vocabulary?: ReadingVocabulary[];
  questions?: ReadingQuestion[];
  cover_image_url?: string | null;
  cover_image_object_key?: string | null;
  is_published?: boolean;
}

export interface ReadingAdminStats {
  totalReadings: number;
  publishedReadings: number;
  draftReadings: number;
  readingsWithImages: number;
  readingsWithoutImages: number;
}

export interface ReadingValidationErrorItem {
  field: string;
  message: string;
}

export interface ReadingValidationResult {
  valid: boolean;
  isBulk: boolean;
  reading: RawReadingInput | null;
  readings: RawReadingInput[];
  errors: ReadingValidationErrorItem[];
  totalCount?: number;
  validCount?: number;
}

// ============================================================================
// AI-Prompt-Based Poll Types
// ============================================================================

export interface PollBit {
  id: string;
  question: string;
  options: string[];
  category: string;
  allow_multiple: boolean;
  show_results_after_vote: boolean;
  is_published: boolean;
  total_votes: number;
  prompt?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / user state
  user_voted_options?: string[];
  option_votes?: Record<string, number>;
  option_percentages?: Record<string, number>;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  category?: string;
  allow_multiple?: boolean;
  show_results_after_vote?: boolean;
  is_published?: boolean;
  prompt?: string;
}

export interface PollVoteResult {
  success: boolean;
  poll_id: string;
  selected_options: string[];
  total_votes: number;
  option_votes: Record<string, number>;
  option_percentages: Record<string, number>;
  already_voted?: boolean;
}

export interface PollAdminStats {
  totalPolls: number;
  publishedPolls: number;
  draftPolls: number;
  totalVotes: number;
}

export interface AIPollGenerationResult {
  question: string;
  options: string[];
  category: string;
  allow_multiple: boolean;
  show_results_after_vote: boolean;
  prompt: string;
}

// ============================================================================
// Sentence Reorder Activity Types
// ============================================================================
export * from './reorder';

// ============================================================================
// Spelling Scramble Activity Types
// ============================================================================
export * from './spellingScramble';

// ============================================================================
// Word of the Day Types
// ============================================================================
export * from './wordOfTheDay';

