export type GameId =
  | 'liquid-sentences'
  | 'save-the-balloon'
  | 'memory-match'
  | 'classroom-jigsaw'
  | 'lumina-words';

export type LevelUnlockMode = 'sequential' | 'scheduled' | 'daily_limit';

export interface LiquidSentenceItem {
  text: string;
  hint?: string;
}

export interface LiquidSentencesConfig {
  sentences: LiquidSentenceItem[];
}

export interface BalloonWordItem {
  word: string;
  hint?: string;
}

export interface SaveTheBalloonConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  lives?: 5 | 6 | 8;
  showTimer?: boolean;
  allowHints?: boolean;
  words: BalloonWordItem[];
}

export interface MemoryMatchPairItem {
  term: string;
  definition: string;
  imageUrl?: string;
}

export interface MemoryMatchConfig {
  themeName?: string;
  pairs: MemoryMatchPairItem[];
}

export type JigsawQuestionType = 'mcq' | 'true_false' | 'unscramble';

export interface JigsawMcqQuestion {
  id: string;
  type: 'mcq';
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface JigsawTrueFalseQuestion {
  id: string;
  type: 'true_false';
  prompt: string;
  correctAnswer: boolean;
}

export interface JigsawUnscrambleQuestion {
  id: string;
  type: 'unscramble';
  sentence: string;
  shuffledTokens?: string[];
}

export type JigsawQuestion =
  | JigsawMcqQuestion
  | JigsawTrueFalseQuestion
  | JigsawUnscrambleQuestion;

export interface JigsawSanitizedQuestion {
  id: string;
  type: JigsawQuestionType;
  prompt?: string;
  options?: [string, string, string, string];
  shuffledTokens?: string[];
  wordCount?: number;
}

export interface JigsawAnswerRecord {
  questionId: string;
  type: JigsawQuestionType;
  submittedAnswer: number | boolean | string[];
  isCorrect: boolean;
  correctAnswerDisplay: string;
  correctIndex?: 0 | 1 | 2 | 3;
  correctBoolean?: boolean;
  correctSentence?: string;
  submittedAt: string;
}

export interface JigsawProgressState {
  puzzleCompleted: boolean;
  puzzleCompletedAt?: string;
  answers: Record<string, JigsawAnswerRecord>;
  currentQuestionIndex: number;
  questionsUnlockedCount?: number;
  puzzlePoints?: number;
  questionPoints?: number;
  totalPointsEarned?: number;
}

export interface ClassroomJigsawConfig {
  imageDataUrl?: string;
  images?: string[];
  gridSize: 2 | 3 | 4;
  title?: string;
  showTimer?: boolean;
  questionsEnabled?: boolean;
  questions?: JigsawQuestion[];
  questionCount?: number;
  questionsLocked?: boolean;
}

export interface LuminaWordItem {
  word: string;
  clue: string;
}

export interface LuminaPuzzleDefinition {
  puzzleNumber: number;
  letters: string[];
  words: LuminaWordItem[];
}

export interface LuminaWordsConfig {
  title?: string;
  words: LuminaWordItem[];
  puzzles?: LuminaPuzzleDefinition[];
}

export type GameConfig =
  | LiquidSentencesConfig
  | SaveTheBalloonConfig
  | MemoryMatchConfig
  | ClassroomJigsawConfig
  | LuminaWordsConfig;

export interface GameLevelDefinition {
  id: string;
  levelNumber: number;
  title: string;
  instructions?: string;
  points: number;
  isManuallyLocked?: boolean;
  unlockAt?: string | null;
  config: GameConfig;
}

export interface GameCatalogItem {
  id: GameId;
  name: string;
  shortDescription: string;
  category: string;
  thumbnailUrl: string;
  accentColor: string;
  badgeLabel: string;
  htmlPath: string;
  defaultPoints: number;
}

export interface GameAssignmentSettings {
  is_game_library: true;
  library_game_id?: string;
  game_id: GameId;
  game_name: string;
  unlock_mode?: LevelUnlockMode;
  daily_limit?: number;
  levels?: GameLevelDefinition[];
  game_config?: GameConfig;
}

export interface SavedLibraryGame {
  id: string;
  teacher_id: string;
  game_id: GameId;
  title: string;
  description: string;
  thumbnail_url: string;
  unlock_mode: LevelUnlockMode;
  daily_limit: number;
  levels: GameLevelDefinition[];
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompletedLevelRecord {
  levelId: string;
  levelNumber: number;
  title: string;
  scoreEarned: number;
  maxPoints: number;
  percentage: number;
  timeTakenSeconds: number;
  completedAt: string;
  details?: Record<string, unknown> | null;
}

export interface GameCompletionPayload {
  gameId: GameId;
  levelId?: string;
  scoreEarned: number;
  maxPoints: number;
  completed: boolean;
  timeTakenSeconds: number;
  details?: Record<string, unknown>;
}

export interface GameSubmissionResponse {
  success: boolean;
  alreadySubmitted?: boolean;
  pointsAwarded: number;
  existingScore?: number;
  maxPoints: number;
  percentage?: number;
  timeTakenSeconds?: number;
  submissionId?: string | null;
  levelId?: string;
  completedLevelsCount?: number;
  totalLevels?: number;
  totalPointsEarned?: number;
  message?: string;
  error?: string;
}
