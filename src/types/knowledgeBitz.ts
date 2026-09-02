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
  category: string; // Master categories (e.g. 'Science & Nature', 'Personal Growth', 'Mysteries & Legends')
  sub_topic?: string | null; // Internal subtopic (e.g. 'Mindset & Habits', 'Ancient Mysteries')
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
// Helper: normalize quiz and randomize answer positions safely
// ============================================================================

/**
 * Fisher-Yates array shuffle algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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

/**
 * Prepares and normalizes quiz questions for interactive playback.
 * - Ensures questions are formatted as an array.
 * - Randomizes option positions using Fisher-Yates so that the correct answer does NOT always appear in position 1.
 * - Preserves the exact correct_answer text identity so correctness comparison travels with the answer.
 */
export function prepareBitzQuiz(quiz: any, randomizeOptions: boolean = true): BitzQuizQuestion[] {
  const rawArray = normalizeQuizToArray(quiz);
  if (!rawArray || rawArray.length === 0) return [];

  return rawArray.map((q) => {
    if (!q || typeof q !== 'object') return q;
    const rawOptions = Array.isArray(q.options)
      ? [...q.options]
      : (Array.isArray((q as any).choices) ? [...(q as any).choices] : []);
    const correctAns = String(q.correct_answer || (q as any).correctAnswer || '').trim();

    // Ensure correct answer is present in options
    if (correctAns && !rawOptions.some(opt => String(opt).trim().toLowerCase() === correctAns.toLowerCase())) {
      rawOptions.push(correctAns);
    }

    // Deduplicate options while preserving string values
    const uniqueOptions: string[] = [];
    const seen = new Set<string>();
    rawOptions.forEach(opt => {
      const clean = String(opt || '').trim();
      const lower = clean.toLowerCase();
      if (clean && !seen.has(lower)) {
        seen.add(lower);
        uniqueOptions.push(clean);
      }
    });

    const finalOptions = randomizeOptions ? shuffleArray(uniqueOptions) : uniqueOptions;

    return {
      ...q,
      options: finalOptions,
      correct_answer: correctAns || (finalOptions[0] || ''),
      xp: q.xp || 2
    };
  });
}

