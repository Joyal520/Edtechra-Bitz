// ============================================================================
// EDTECHRA-BITZ: Complete Knowledge Bitz Discovery & Learning Types
// ============================================================================

export type BitzDifficulty = 'Easy' | 'Medium' | 'Hard';

export type BitzVisualStatus = 'missing' | 'generating' | 'ready' | 'failed';

export type BitzPublishStatus = 'draft' | 'review' | 'published' | 'archived';

export type BitzLearningStatus = 'unseen' | 'seen' | 'opened' | 'read' | 'learned';

export type BitzCefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface BitzQuizData {
  question: string;
  options: string[];
  correct_answer?: string;
  correctAnswer?: string; // Support camelCase
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
  short_fact: string; // 1-2 sentence supporting explanation on card
  reading_text: string; // 80-120 word clear reading explanation
  topic_id: string; // e.g. 'science', 'biology', 'space'
  category: string; // e.g. 'Science & Nature'
  sub_topic?: string | null;
  difficulty: BitzDifficulty;
  cefr_level: BitzCefrLevel; // CEFR English proficiency (A1-C2)
  content_hash?: string | null; // SHA-256 for deduplication
  reading_time_sec: number; // default 30
  
  // Media & Visuals
  visual_url?: string | null;
  visual_object_key?: string | null;
  visual_status: BitzVisualStatus;
  audio_url?: string | null;
  
  // Interactive Elements
  quiz?: BitzQuizData | null;
  vocabulary?: BitzVocabularyWord[] | null;
  source_citation?: string | null;
  
  // Gamification & Engagement
  xp_value: number; // default 10
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
  quiz?: BitzQuizData | null;
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
  selectedTopics: string[]; // array of topic_id strings, or empty/all
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
  quiz?: BitzQuizData;
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
