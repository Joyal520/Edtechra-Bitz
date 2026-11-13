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

export interface ClassroomJigsawConfig {
  imageDataUrl?: string;
  images?: string[];
  gridSize: 2 | 3 | 4;
  title?: string;
}

export interface LuminaWordItem {
  word: string;
  clue: string;
}

export interface LuminaWordsConfig {
  title?: string;
  words: LuminaWordItem[];
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
  game_id: GameId;
  game_name: string;
  unlock_mode?: LevelUnlockMode;
  daily_limit?: number;
  levels?: GameLevelDefinition[];
  game_config?: GameConfig;
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
