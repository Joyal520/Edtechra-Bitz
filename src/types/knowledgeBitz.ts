// ============================================================================
// EDTECHRA-BITZ: Complete Knowledge Bitz Discovery & Learning Types
// V2: 10 main categories, 5-quiz system, subtopics as internal metadata
// ============================================================================

export type BitzDifficulty = 'Easy' | 'Medium' | 'Hard';

export type BitzVisualStatus = 'missing' | 'generating' | 'ready' | 'failed';

export type BitzPublishStatus = 'draft' | 'review' | 'published' | 'archived';

export type BitzLearningStatus = 'unseen' | 'seen' | 'opened' | 'read' | 'learned';

export type BitzCefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type BitzImageSource = 'none' | 'admin' | 'manual' | 'pixabay' | 'gemini' | 'pexels' | 'unsplash' | 'openverse';

export interface BitzQuizQuestion {
  question: string;
  options: string[];
  correct_answer?: string;
  correctAnswer?: string; // Support camelCase from some AI outputs
  explanation?: string;
  xp?: number; // default 2
}

/** @deprecated — Use BitzQuizQuestion instead. Kept for backward compat with single-quiz records. */
export interface BitzQuizData {
  question: string;
  options: string[];
  correct_answer?: string;
  correctAnswer?: string;
  explanation: string;
  xpReward?: number;
}

export interface BitzVocabularyWord {
  word: string;
  definition: string;
  pronunciation?: string;
  part_of_speech?: string;
  example?: string;
}

export interface KnowledgeBitzItem {
  id: string;
  bitz_code: string; // e.g. "B000001"
  title: string; // Hook / Big Headline
  short_fact: string; // 20–30 word discovery preview
  reading_text: string; // Exactly 100-word reading explanation
  topic_id: string; // legacy subtopic identifier (e.g. 'biology', 'space')
  category: string; // One of 10 main categories (e.g. 'Science & Nature')
  sub_topic?: string | null; // Internal subtopic (e.g. 'Myths & Legends')
  difficulty: BitzDifficulty;
  cefr_level: BitzCefrLevel; // CEFR English proficiency (A1-C2)
  content_hash?: string | null; // SHA-256 for deduplication
  reading_time_sec: number; // default 30

  // Media & Visuals
  visual_url?: string | null;
  visual_object_key?: string | null;
  visual_status: BitzVisualStatus;
  image_source?: BitzImageSource;
  image_source_id?: string | null;
  image_source_url?: string | null;
  audio_url?: string | null;

  // Interactive Elements — quiz is an array of 5 questions (2 XP each)
  // Backward compat: may still be a single object for legacy records
  quiz?: BitzQuizQuestion[] | BitzQuizQuestion | BitzQuizData | null;
  vocabulary?: BitzVocabularyWord[] | null;
  source_citation?: string | null;

  // Gamification & Engagement
  xp_value: number; // default 10 (5 questions × 2 XP)
  likes_count: number;
  saves_count: number;
  shares_count: number;
  views_count: number;
  completions_count: number;

  // User Relationship States (computed per active session)
  is_liked_by_me?: boolean;
  is_saved_by_me?: boolean;
  learning_status?: BitzLearningStatus; // 'unseen' | 'seen' | 'opened' | 'read' | 'learned'
  has_learned?: boolean;
  quiz_progress?: number; // 0-5: how many questions answered

  status: BitzPublishStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBitzInput {
  title: string;
  short_fact: string;
  reading_text: string;
  topic_id: string;
  category?: string;
  sub_topic?: string;
  difficulty?: BitzDifficulty;
  cefr_level?: BitzCefrLevel;
  reading_time_sec?: number;
  visual_url?: string;
  visual_object_key?: string;
  visual_status?: BitzVisualStatus;
  source_citation?: string;
  quiz?: BitzQuizQuestion[] | BitzQuizData | null;
  vocabulary?: BitzVocabularyWord[];
  xp_value?: number;
  status?: BitzPublishStatus;
}

export interface BitzFeedResponse {
  success: boolean;
  bitz: KnowledgeBitzItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  allLearnedNotice?: boolean;
  selectedTopicsCount?: number;
}

export interface BitzUserTopicPreferences {
  userId: string;
  selectedTopics: string[]; // array of category IDs from the 10 main categories
  isAllTopicsSelected: boolean;
  updatedAt: string;
}

export interface BitzLearningStateResult {
  success: boolean;
  bitzId: string;
  status: BitzLearningStatus;
  isCorrect?: boolean | null;
  xpAwarded: number;
  alreadyLearned: boolean;
  explanation?: string;
  questionIndex?: number;
  totalQuestionsAnswered?: number;
}

export interface BitzBulkImportRecord {
  title: string;
  short_fact: string;
  reading_text: string;
  topic_id: string;
  category?: string;
  sub_topic?: string;
  difficulty?: BitzDifficulty;
  cefr_level?: BitzCefrLevel;
  source_citation?: string;
  quiz?: BitzQuizQuestion[];
  vocabulary?: BitzVocabularyWord[];
}

export interface BitzBulkImportResult {
  totalSubmitted: number;
  importedCount: number;
  failedCount: number;
  errors: { index: number; title: string; reason: string }[];
  imported: KnowledgeBitzItem[];
}

export interface BitzAdminStats {
  totalBitz: number;
  publishedCount: number;
  draftCount: number;
  readyImageCount: number;
  missingImageCount: number;
  generatingImageCount: number;
  failedImageCount: number;
  totalCompletions: number;
  totalLikes: number;
  totalSaves: number;
}

// ============================================================================
// Helper: normalize quiz to array format
// ============================================================================

/**
 * Normalize quiz field to always be an array of BitzQuizQuestion[].
 * Handles: null, single object, or array.
 */
export function normalizeQuizToArray(quiz: any): BitzQuizQuestion[] {
  if (!quiz) return [];
  if (Array.isArray(quiz)) return quiz;
  if (typeof quiz === 'object' && quiz.question) return [quiz];
  return [];
}
