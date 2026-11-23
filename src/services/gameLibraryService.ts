import { authenticatedFetch } from '@/lib/apiAuth';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/types/classroom';
import type {
  ActivityCategory,
  ActivityType,
  ClassroomJigsawConfig,
  ConnectionsConfig,
  GameAssignmentSettings,
  GameCatalogItem,
  GameCompletionPayload,
  GameConfig,
  GameId,
  GameLevelDefinition,
  GameSubmissionResponse,
  LevelUnlockMode,
  LiquidSentencesConfig,
  LuminaWordsConfig,
  MemoryMatchConfig,
  SaveTheBalloonConfig,
  SavedLibraryGame,
  SnakeSpellConfig,
  StandaloneTrainingConfig
} from '@/types/gameLibrary';
import { createLevelId } from '@/utils/gameLevelUtils';

export interface ActivityCategoryFilterOption {
  id: 'all' | ActivityCategory;
  label: string;
  shortLabel: string;
}

export const ACTIVITY_CATEGORIES: ActivityCategoryFilterOption[] = [
  { id: 'all', label: 'All Activities', shortLabel: 'All' },
  { id: 'brain-memory', label: 'Brain & Memory', shortLabel: 'Brain & Memory' },
  { id: 'focus-speed', label: 'Focus & Speed', shortLabel: 'Focus & Speed' },
  { id: 'mathematics', label: 'Mathematics', shortLabel: 'Mathematics' },
  { id: 'knowledge', label: 'General Knowledge', shortLabel: 'Knowledge' },
  { id: 'language', label: 'Language', shortLabel: 'Language' },
  { id: 'mindfulness', label: 'Mindfulness & Wellness', shortLabel: 'Mindfulness' },
  { id: 'problem-solving', label: 'Problem Solving', shortLabel: 'Problem Solving' },
  { id: 'creativity', label: 'Creativity', shortLabel: 'Creativity' },
  { id: 'competitions', label: 'Competitions', shortLabel: 'Competitions' }
];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  game: 'Game',
  cognitive_training: 'Cognitive Training',
  mindfulness: 'Mindfulness / Wellness',
  knowledge_challenge: 'Knowledge Challenge',
  competition: 'Competition'
};

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'liquid-sentences',
    name: 'Liquid Sentences',
    shortDescription:
      'Students arrange scrambled words into meaningful sentences with optional hints and fluid animations.',
    category: 'Grammar & Syntax',
    categoryId: 'language',
    activityType: 'game',
    estimatedDuration: '3–5 min',
    difficulty: 'All Levels',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_6i2hc86i2hc86i2h.jpg',
    accentColor: 'from-cyan-500 to-blue-600',
    badgeLabel: 'Sentence Builder',
    htmlPath: '/games/liquid-sentences.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'save-the-balloon',
    name: 'Save the Balloon',
    shortDescription:
      'Guess letters to uncover each secret word before the balloon floats away, with custom clues and difficulty.',
    category: 'Vocabulary & Spelling',
    categoryId: 'language',
    activityType: 'game',
    estimatedDuration: '3–5 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_41exj441exj441ex.jpg',
    accentColor: 'from-rose-500 to-amber-500',
    badgeLabel: 'Word Rescue',
    htmlPath: '/games/save-the-balloon.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    shortDescription:
      'Flip cards to pair vocabulary terms with definitions or uploaded pictures in a timed matching challenge.',
    category: 'Recall & Matching',
    categoryId: 'brain-memory',
    activityType: 'game',
    estimatedDuration: '2–4 min',
    difficulty: 'All Levels',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_ezubsaezubsaezub.jpg',
    accentColor: 'from-violet-500 to-fuchsia-600',
    badgeLabel: 'Card Pairs',
    htmlPath: '/games/memory-match.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'classroom-jigsaw',
    name: 'Classroom Jigsaw',
    shortDescription:
      'Upload one or more classroom images and turn them into interactive jigsaw puzzles at your chosen grid size.',
    category: 'Visual & Spatial',
    categoryId: 'problem-solving',
    activityType: 'game',
    estimatedDuration: '4–8 min',
    difficulty: 'All Levels',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_oocop3oocop3ooco.jpg',
    accentColor: 'from-emerald-500 to-teal-600',
    badgeLabel: 'Visual Puzzle',
    htmlPath: '/games/classroom-jigsaw.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'lumina-words',
    name: 'Lumina Words',
    shortDescription:
      'Swipe connected letters on the glowing wheel to solve a custom crossword generated from your words and clues.',
    category: 'Spelling & Wordplay',
    categoryId: 'language',
    activityType: 'game',
    estimatedDuration: '3–6 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_8kpi9b8kpi9b8kpi.jpg',
    accentColor: 'from-indigo-500 to-purple-600',
    badgeLabel: 'Word Wheel',
    htmlPath: '/games/lumina-words.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'snake-spell',
    name: 'Snake Spell',
    shortDescription:
      'Guide the animated snake to catch missing letter orbs and spell custom classroom words with optional emoji or text clues.',
    category: 'Spelling & Phonics',
    categoryId: 'language',
    activityType: 'game',
    estimatedDuration: '3–5 min',
    difficulty: 'Beginner',
    thumbnailUrl: '/games/thumbnails/snake-spell.jpg',
    accentColor: 'from-emerald-500 to-cyan-600',
    badgeLabel: 'Word Arcade',
    htmlPath: '/games/snake-spell.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'connections',
    name: 'Connections',
    shortDescription:
      'Sort sixteen words into four hidden themed categories across graded logic tiers using hints and category clues.',
    category: 'Logic & Categorisation',
    categoryId: 'problem-solving',
    activityType: 'game',
    estimatedDuration: '3–6 min',
    difficulty: 'Intermediate',
    thumbnailUrl: '/games/thumbnails/connections.jpg',
    accentColor: 'from-amber-500 to-purple-600',
    badgeLabel: 'Word Logic',
    htmlPath: '/games/connections.html',
    defaultPoints: 100,
    supportsScoring: true,
    defaultLeaderboardEnabled: true
  },
  {
    id: 'memory-lab',
    name: 'Memory Lab',
    shortDescription:
      'Observe luminous grid patterns and recall sequences forwards or backwards across progressive difficulty speeds.',
    category: 'Brain & Memory',
    categoryId: 'brain-memory',
    activityType: 'game',
    estimatedDuration: '3–5 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/memory-lab.jpg',
    accentColor: 'from-indigo-600 to-violet-600',
    badgeLabel: 'Pattern Memory',
    htmlPath: '/games/memory-lab.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Score', 'Level Reached', 'Accuracy']
  },
  {
    id: 'number-memory-challenge',
    name: 'Number Memory Challenge',
    shortDescription:
      'Train working memory by recalling forward, reverse, missing, and pattern-based number sequences.',
    category: 'Brain & Memory',
    categoryId: 'brain-memory',
    activityType: 'cognitive_training',
    estimatedDuration: '2–4 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/number-memory-challenge.jpg',
    accentColor: 'from-blue-500 to-indigo-600',
    badgeLabel: 'Working Memory',
    htmlPath: '/games/number-memory-challenge.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Highest Number Remembered', 'Levels Completed', 'Accuracy']
  },
  {
    id: 'missing-piece',
    name: 'Missing Piece',
    shortDescription:
      'Analyze visual rules across shapes, colors, sizes, and rotations to identify the missing geometric tile.',
    category: 'Brain & Memory',
    categoryId: 'brain-memory',
    activityType: 'game',
    estimatedDuration: '3–6 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/missing-piece.jpg',
    accentColor: 'from-sky-500 to-purple-600',
    badgeLabel: 'Visual IQ',
    htmlPath: '/games/missing-piece.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Score', 'Correct Answers', 'Levels Completed']
  },
  {
    id: 'stroop-challenge',
    name: 'Stroop Challenge',
    shortDescription:
      'Boost selective attention and reaction speed by matching ink colors instead of the written word under time pressure.',
    category: 'Focus & Cognitive Speed',
    categoryId: 'focus-speed',
    activityType: 'cognitive_training',
    estimatedDuration: '2–3 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/stroop-challenge.jpg',
    accentColor: 'from-fuchsia-500 to-indigo-600',
    badgeLabel: 'Focus & Reflex',
    htmlPath: '/games/stroop-challenge.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Score', 'Correct Responses', 'Accuracy']
  },
  {
    id: 'chrono-vault',
    name: 'Chrono Vault',
    shortDescription:
      'Slide interlocking blocks across 1,000 spatial logic levels to guide the glowing core through the vault exit.',
    category: 'Focus & Cognitive Speed',
    categoryId: 'focus-speed',
    activityType: 'cognitive_training',
    estimatedDuration: '3–8 min',
    difficulty: 'All Levels',
    thumbnailUrl: '/games/thumbnails/chrono-vault.jpg',
    accentColor: 'from-amber-500 to-cyan-600',
    badgeLabel: 'Spatial Logic',
    htmlPath: '/games/chrono-vault.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Levels Completed', 'Moves vs Par', 'Stars']
  },
  {
    id: 'math-sprint',
    name: 'Math Sprint',
    shortDescription:
      'Race the 60-second clock solving rapid mental arithmetic chains with streak multipliers across skill tiers.',
    category: 'Mathematics',
    categoryId: 'mathematics',
    activityType: 'game',
    estimatedDuration: '1–2 min',
    difficulty: 'Adaptive',
    thumbnailUrl: '/games/thumbnails/math-sprint.jpg',
    accentColor: 'from-blue-600 to-cyan-500',
    badgeLabel: 'Mental Math',
    htmlPath: '/games/math-sprint.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Score', 'Correct Answers', 'Accuracy']
  },
  {
    id: 'rapid-knowledge-challenge',
    name: 'Rapid Knowledge Challenge',
    shortDescription:
      'Test general knowledge across Science, Geography, History, English, Math, and ICT against a timed countdown.',
    category: 'General Knowledge',
    categoryId: 'knowledge',
    activityType: 'knowledge_challenge',
    estimatedDuration: '1–2 min',
    difficulty: 'All Levels',
    thumbnailUrl: '/games/thumbnails/rapid-knowledge-challenge.jpg',
    accentColor: 'from-sky-500 to-emerald-500',
    badgeLabel: 'Quick Trivia',
    htmlPath: '/games/rapid-knowledge-challenge.html',
    defaultPoints: 100,
    isStandaloneBuiltIn: true,
    supportsScoring: true,
    defaultLeaderboardEnabled: true,
    resultMetrics: ['Score', 'Correct Answers', 'Accuracy']
  },
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    shortDescription:
      'Calm the mind and sharpen classroom readiness with a guided 4-phase square breathing mindfulness session.',
    category: 'Mindfulness & Wellness',
    categoryId: 'mindfulness',
    activityType: 'mindfulness',
    estimatedDuration: '1–5 min',
    difficulty: 'Gentle',
    thumbnailUrl: '/games/thumbnails/box-breathing.jpg',
    accentColor: 'from-teal-500 to-indigo-600',
    badgeLabel: 'Mindfulness',
    htmlPath: '/games/box-breathing.html',
    defaultPoints: 0,
    isStandaloneBuiltIn: true,
    supportsScoring: false,
    defaultLeaderboardEnabled: false,
    resultMetrics: ['Session Completed', 'Duration', 'Breathing Cycles']
  }
];

export function getGameCatalogItem(gameId: GameId): GameCatalogItem {
  return GAME_CATALOG.find((g) => g.id === gameId) || GAME_CATALOG[0];
}

export function getEmptyConfigForGame(gameId: GameId): GameConfig {
  switch (gameId) {
    case 'liquid-sentences':
      return { sentences: [] };
    case 'save-the-balloon':
      return {
        difficulty: 'medium',
        lives: 6,
        showTimer: true,
        allowHints: true,
        words: []
      };
    case 'memory-match':
      return {
        themeName: '',
        pairs: []
      };
    case 'classroom-jigsaw':
      return {
        imageDataUrl: '',
        images: [],
        gridSize: 3,
        title: '',
        showTimer: true,
        questionsEnabled: false,
        questions: [],
        questionCount: 0
      };
    case 'lumina-words':
      return {
        title: '',
        words: []
      };
    case 'snake-spell':
      return {
        title: '',
        words: [],
        missingLetters: 0,
        lives: 3,
        speed: 1
      };
    case 'connections':
      return {
        title: '',
        groups: [
          { title: '', level: 0, words: ['', '', '', ''] },
          { title: '', level: 1, words: ['', '', '', ''] },
          { title: '', level: 2, words: ['', '', '', ''] },
          { title: '', level: 3, words: ['', '', '', ''] }
        ]
      };
    default: {
      const item = getGameCatalogItem(gameId);
      return {
        title: item.name,
        teacherNote: ''
      } satisfies StandaloneTrainingConfig;
    }
  }
}

export function getDemoConfigForGame(gameId: GameId): GameConfig {
  switch (gameId) {
    case 'liquid-sentences':
      return {
        sentences: [
          { text: 'The mitochondria is the powerhouse of the cell', hint: 'Biology organelle' },
          { text: 'Water boils at one hundred degrees Celsius', hint: 'Phase change temperature' },
          { text: 'Photosynthesis converts sunlight into chemical energy', hint: 'How plants make food' }
        ]
      };
    case 'save-the-balloon':
      return {
        difficulty: 'medium',
        lives: 6,
        showTimer: true,
        allowHints: true,
        words: [
          { word: 'GRAVITY', hint: 'Force that keeps planets in orbit' },
          { word: 'FRACTION', hint: 'Part of a whole number' },
          { word: 'ECOSYSTEM', hint: 'Community of living organisms and their environment' }
        ]
      };
    case 'memory-match':
      return {
        themeName: 'Classroom Vocabulary',
        pairs: [
          { term: 'Evaporation', definition: 'Liquid turning into vapor' },
          { term: 'Condensation', definition: 'Vapor cooling into liquid' },
          { term: 'Precipitation', definition: 'Water falling from clouds' },
          { term: 'Habitat', definition: 'Natural home of an organism' }
        ]
      };
    case 'classroom-jigsaw':
      return {
        imageDataUrl: '',
        images: [],
        gridSize: 3,
        title: 'Classroom Picture Puzzle',
        showTimer: true,
        questionsEnabled: false,
        questions: [],
        questionCount: 0
      };
    case 'lumina-words':
      return {
        title: 'Vocabulary Wheel',
        words: [
          { word: 'PLANET', clue: 'Orbits a star' },
          { word: 'ATOM', clue: 'Basic unit of matter' },
          { word: 'ORBIT', clue: 'Curved path around a celestial body' },
          { word: 'SOLAR', clue: 'Relating to the sun' }
        ]
      };
    case 'snake-spell':
      return {
        title: 'Animal & Science Spell',
        missingLetters: 0,
        lives: 3,
        speed: 1,
        words: [
          { word: 'PLANET', hint: '🪐' },
          { word: 'GARDEN', hint: '🌷' },
          { word: 'ROCKET', hint: '🚀' },
          { word: 'CASTLE', hint: '🏰' },
          { word: 'BRIDGE', hint: '🌉' }
        ]
      };
    case 'connections':
      return {
        title: 'Classic Classroom Connections',
        groups: [
          { title: 'Baby Animals', level: 0, words: ['CALF', 'FOAL', 'JOEY', 'CUB'] },
          { title: 'Body Parts', level: 1, words: ['ELBOW', 'KNEE', 'ANKLE', 'WRIST'] },
          { title: 'Words Ending in "-fish"', level: 2, words: ['STARFISH', 'GOLDFISH', 'JELLYFISH', 'CLOWNFISH'] },
          { title: 'Things That Have Keys', level: 3, words: ['PIANO', 'MAP', 'LOCK', 'TYPEWRITER'] }
        ]
      };
    default: {
      const item = getGameCatalogItem(gameId);
      return {
        title: item.name,
        teacherNote: item.shortDescription
      } satisfies StandaloneTrainingConfig;
    }
  }
}

export interface TeacherClassroomOption {
  id: string;
  name: string;
  subject?: string | null;
  grade_level?: string | null;
}

export interface ClassroomStudentOption {
  id: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export function countGameContentItems(gameId: GameId, levels: GameLevelDefinition[]): number {
  return levels.reduce((total, lvl) => {
    const cfg = lvl.config;
    switch (gameId) {
      case 'liquid-sentences':
        return total + ((cfg as LiquidSentencesConfig).sentences?.length || 0);
      case 'save-the-balloon':
        return total + ((cfg as SaveTheBalloonConfig).words?.length || 0);
      case 'memory-match':
        return total + ((cfg as MemoryMatchConfig).pairs?.length || 0);
      case 'classroom-jigsaw': {
        const jc = cfg as ClassroomJigsawConfig;
        const count = jc.images?.length || (jc.imageDataUrl ? 1 : 0);
        return total + count;
      }
      case 'lumina-words':
        return total + ((cfg as LuminaWordsConfig).words?.length || 0);
      case 'snake-spell':
        return total + ((cfg as SnakeSpellConfig).words?.length || 0);
      case 'connections':
        return total + ((cfg as ConnectionsConfig).groups?.length || 0);
      default:
        return total + 1;
    }
  }, 0);
}

class GameLibraryService {
  async getTeacherClassrooms(): Promise<TeacherClassroomOption[]> {
    if (!supabase) return [];
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('classroom_members')
      .select('classroom:classrooms(id, title, subject, grade, is_archived)')
      .eq('profile_id', user.id)
      .in('role', ['teacher', 'co-teacher'])
      .eq('status', 'active');

    if (error || !data) return [];

    const seen = new Set<string>();
    const options: TeacherClassroomOption[] = [];
    for (const row of data as any[]) {
      const c = row.classroom;
      if (c && c.id && !c.is_archived && !seen.has(c.id)) {
        seen.add(c.id);
        options.push({
          id: c.id,
          name: c.title,
          subject: c.subject,
          grade_level: c.grade
        });
      }
    }
    return options;
  }

  async getClassroomStudents(classroomId: string): Promise<ClassroomStudentOption[]> {
    if (!supabase || !classroomId) return [];
    const { data, error } = await supabase
      .from('classroom_members')
      .select('profile_id, profile:profiles(id, full_name, email, avatar_url)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student')
      .eq('status', 'active');

    if (error || !data) return [];

    const seen = new Set<string>();
    const students: ClassroomStudentOption[] = [];
    for (const row of data as any[]) {
      const p = row.profile;
      const id = p?.id || row.profile_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        students.push({
          id,
          fullName: p?.full_name || p?.email || 'Student',
          email: p?.email || null,
          avatarUrl: p?.avatar_url || null
        });
      }
    }
    return students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async createGameAssignment(params: {
    classroomId: string;
    classroomIds?: string[];
    gameId: GameId;
    title: string;
    points: number;
    dueDate?: string | null;
    startDate?: string | null;
    instructions?: string;
    maxAttempts?: number | null;
    isCompulsory?: boolean;
    showScoresToStudents?: boolean;
    leaderboardEnabled?: boolean;
    assignedStudentIds?: string[] | null;
    config?: GameConfig;
    levels?: GameLevelDefinition[];
    unlockMode?: LevelUnlockMode;
    dailyLimit?: number;
    libraryGameId?: string;
  }): Promise<{ data?: Assignment; createdAssignments?: Assignment[]; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Authentication required' };

    const catalogItem = getGameCatalogItem(params.gameId);
    const supportsScoring = catalogItem.supportsScoring !== false;
    const targetClassroomIds =
      Array.isArray(params.classroomIds) && params.classroomIds.length > 0
        ? Array.from(new Set(params.classroomIds.filter(Boolean)))
        : [params.classroomId];

    let normalizedLevels =
      params.levels && params.levels.length > 0
        ? params.levels.map((lvl, idx) => ({
            ...lvl,
            levelNumber: idx + 1,
            points: supportsScoring ? Math.max(0, Math.round(lvl.points ?? 20)) : 0
          }))
        : undefined;

    const totalPoints = !supportsScoring
      ? 0
      : normalizedLevels
        ? normalizedLevels.reduce((sum, l) => sum + l.points, 0)
        : Math.max(0, Math.round(params.points ?? catalogItem.defaultPoints));

    const levelSummary = normalizedLevels
      ? `${normalizedLevels.length} ${normalizedLevels.length === 1 ? 'level' : 'levels'}`
      : 'interactive activity';

    const cleanInstructions =
      (params.instructions || '').trim() ||
      (supportsScoring
        ? `Complete ${catalogItem.name}: "${params.title.trim()}" (${levelSummary}) to earn up to ${totalPoints} points.`
        : `Complete the ${catalogItem.name} session: "${params.title.trim()}".`);

    const createdAssignments: Assignment[] = [];

    for (const targetClassroomId of targetClassroomIds) {
      let jigsawSealedKeys: string | undefined;
      let rawLevelsForKeySync: GameLevelDefinition[] | undefined;
      let classroomLevels = normalizedLevels ? JSON.parse(JSON.stringify(normalizedLevels)) : undefined;

      if (params.gameId === 'classroom-jigsaw') {
        const levelsToSeal =
          classroomLevels ||
          (params.config
            ? [
                {
                  id: 'level-1',
                  levelNumber: 1,
                  title: params.title.trim(),
                  points: totalPoints,
                  config: params.config
                } as GameLevelDefinition
              ]
            : []);

        const hasAnyQuestions = levelsToSeal.some((lvl: GameLevelDefinition) => {
          const jc = lvl.config as ClassroomJigsawConfig;
          return Boolean(jc?.questionsEnabled) && Array.isArray(jc?.questions) && jc.questions.length > 0;
        });

        if (hasAnyQuestions) {
          rawLevelsForKeySync = levelsToSeal;
          try {
            const sealRes = await authenticatedFetch('/api/games/jigsaw/seal-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classroomId: targetClassroomId,
                levels: levelsToSeal
              })
            });
            const sealJson = await sealRes.json();
            if (!sealRes.ok || !sealJson?.success) {
              return {
                error: sealJson?.error || 'Failed to secure interactive Jigsaw questions before publishing.'
              };
            }
            jigsawSealedKeys = sealJson.jigsawSealedKeys;
            if (classroomLevels && Array.isArray(sealJson.levels)) {
              classroomLevels = sealJson.levels;
            }
          } catch (sealErr: any) {
            return {
              error: sealErr?.message || 'Unable to secure interactive Jigsaw questions before publishing.'
            };
          }
        }
      }

      const sanitizedSingleConfig =
        params.gameId === 'classroom-jigsaw'
          ? classroomLevels?.[0]?.config ||
            (params.config
              ? (() => {
                  const { questions: _ignored, ...rest } = params.config as ClassroomJigsawConfig;
                  return rest;
                })()
              : undefined)
          : params.config || classroomLevels?.[0]?.config;

      const assignedStudentIds =
        targetClassroomIds.length === 1 && Array.isArray(params.assignedStudentIds) && params.assignedStudentIds.length > 0
          ? params.assignedStudentIds
          : null;

      const settings: GameAssignmentSettings & { jigsaw_sealed_keys?: string } = {
        is_game_library: true,
        ...(params.libraryGameId ? { library_game_id: params.libraryGameId } : {}),
        game_id: params.gameId,
        game_name: catalogItem.name,
        activity_type: catalogItem.activityType,
        category_id: catalogItem.categoryId,
        supports_scoring: supportsScoring,
        teacher_instructions: cleanInstructions,
        start_date: params.startDate || null,
        max_attempts: params.maxAttempts ?? 1,
        is_compulsory: params.isCompulsory ?? true,
        show_scores_to_students: supportsScoring ? (params.showScoresToStudents ?? true) : false,
        leaderboard_enabled: supportsScoring ? (params.leaderboardEnabled ?? (catalogItem.defaultLeaderboardEnabled !== false)) : false,
        assigned_student_ids: assignedStudentIds,
        unlock_mode: params.unlockMode || 'sequential',
        daily_limit: params.dailyLimit || 1,
        levels: classroomLevels,
        game_config: sanitizedSingleConfig,
        ...(jigsawSealedKeys ? { jigsaw_sealed_keys: jigsawSealedKeys } : {})
      };

      try {
        const { data, error } = await supabase
          .from('assignments')
          .insert({
            classroom_id: targetClassroomId,
            title: params.title.trim(),
            instructions: cleanInstructions,
            assignment_type: 'activity',
            points: totalPoints,
            due_date: params.dueDate || null,
            attachment_urls: [],
            settings,
            created_by: user.id,
            status: 'published'
          })
          .select()
          .single();

        if (error) throw error;

        if (data?.id && rawLevelsForKeySync) {
          authenticatedFetch('/api/games/jigsaw/seal-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classroomId: targetClassroomId,
              assignmentId: data.id,
              levels: rawLevelsForKeySync
            })
          }).catch(() => {
            // Sealed payload inside assignment settings already protects answer keys.
          });
        }

        if (data) {
          createdAssignments.push(data as Assignment);
        }
      } catch (err: any) {
        console.error('[GameLibraryService] createGameAssignment error:', err);
        return { error: err?.message || 'Failed to publish activity assignment.' };
      }
    }

    return {
      data: createdAssignments[0],
      createdAssignments
    };
  }

  async getSavedGames(): Promise<SavedLibraryGame[]> {
    if (!supabase) return [];
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('teacher_game_library')
      .select('*')
      .eq('teacher_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[GameLibraryService] getSavedGames error:', error);
      return [];
    }
    return (data || []) as SavedLibraryGame[];
  }

  async saveGameToLibrary(params: {
    id?: string;
    gameId: GameId;
    title: string;
    description?: string;
    levels: GameLevelDefinition[];
    unlockMode?: LevelUnlockMode;
    dailyLimit?: number;
    settings?: Record<string, unknown>;
  }): Promise<{ data?: SavedLibraryGame; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Authentication required' };

    const catalogItem = getGameCatalogItem(params.gameId);
    const supportsScoring = catalogItem.supportsScoring !== false;
    const normalizedLevels = params.levels.map((lvl, idx) => ({
      ...lvl,
      levelNumber: idx + 1,
      points: supportsScoring ? Math.max(0, Math.round(lvl.points ?? 20)) : 0
    }));

    const payload = {
      teacher_id: user.id,
      game_id: params.gameId,
      title: params.title.trim() || `${catalogItem.name} Challenge`,
      description: (params.description ?? catalogItem.shortDescription).trim(),
      thumbnail_url: catalogItem.thumbnailUrl,
      unlock_mode: params.unlockMode || 'sequential',
      daily_limit: Math.max(1, Number(params.dailyLimit || 1)),
      levels: normalizedLevels,
      settings: params.settings || {},
      updated_at: new Date().toISOString()
    };

    try {
      if (params.id) {
        const { data, error } = await supabase
          .from('teacher_game_library')
          .update(payload)
          .eq('id', params.id)
          .eq('teacher_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return { data: data as SavedLibraryGame };
      }

      const { data, error } = await supabase
        .from('teacher_game_library')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return { data: data as SavedLibraryGame };
    } catch (err: any) {
      console.error('[GameLibraryService] saveGameToLibrary error:', err);
      return { error: err?.message || 'Failed to save game to library.' };
    }
  }

  async duplicateSavedGame(game: SavedLibraryGame): Promise<{ data?: SavedLibraryGame; error?: string }> {
    const clonedLevels: GameLevelDefinition[] = (game.levels || []).map((lvl, idx) => ({
      ...JSON.parse(JSON.stringify(lvl)),
      id: createLevelId(),
      levelNumber: idx + 1
    }));

    return this.saveGameToLibrary({
      gameId: game.game_id,
      title: `${game.title} (Copy)`,
      description: game.description,
      levels: clonedLevels,
      unlockMode: game.unlock_mode,
      dailyLimit: game.daily_limit,
      settings: game.settings ? JSON.parse(JSON.stringify(game.settings)) : {}
    });
  }

  async deleteSavedGame(id: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase is not configured' };
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    try {
      const { error } = await supabase
        .from('teacher_game_library')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('[GameLibraryService] deleteSavedGame error:', err);
      return { success: false, error: err?.message || 'Failed to delete saved game.' };
    }
  }

  async getJigsawState(assignmentId: string, levelId?: string): Promise<any> {
    try {
      const qs = new URLSearchParams({ assignmentId });
      if (levelId) qs.set('levelId', levelId);
      const res = await authenticatedFetch(`/api/games/jigsaw/state?${qs.toString()}`, {
        method: 'GET'
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to load Jigsaw state.' };
    }
  }

  async unlockJigsawQuestions(assignmentId: string, levelId?: string): Promise<any> {
    try {
      const res = await authenticatedFetch('/api/games/jigsaw/unlock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, levelId: levelId || null })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to unlock Jigsaw questions.' };
    }
  }

  async submitJigsawAnswer(params: {
    assignmentId: string;
    levelId?: string;
    questionId: string;
    submittedAnswer: unknown;
  }): Promise<any> {
    try {
      const res = await authenticatedFetch('/api/games/jigsaw/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: params.assignmentId,
          levelId: params.levelId || null,
          questionId: params.questionId,
          submittedAnswer: params.submittedAnswer
        })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to submit answer.' };
    }
  }

  async submitGameCompletion(params: {
    assignmentId: string;
    classroomId: string;
    payload: GameCompletionPayload;
  }): Promise<GameSubmissionResponse> {
    try {
      const res = await authenticatedFetch('/api/games/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: params.assignmentId,
          classroomId: params.classroomId,
          gameId: params.payload.gameId,
          levelId: params.payload.levelId || null,
          scoreEarned: params.payload.scoreEarned,
          maxPoints: params.payload.maxPoints,
          completed: params.payload.completed,
          timeTakenSeconds: params.payload.timeTakenSeconds,
          details: params.payload.details || null
        })
      });

      const data = (await res.json()) as GameSubmissionResponse;
      if (!res.ok) {
        return {
          success: false,
          pointsAwarded: 0,
          maxPoints: params.payload.maxPoints,
          error: data.error || `Submission failed (${res.status})`
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        pointsAwarded: 0,
        maxPoints: params.payload.maxPoints,
        error: err?.message || 'Network error while submitting game score.'
      };
    }
  }

  async getTeacherGamesDashboard(classroomId?: string): Promise<{
    data?: TeacherGamesDashboardData;
    error?: string;
  }> {
    try {
      const query = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}&_t=${Date.now()}` : `?_t=${Date.now()}`;
      const res = await authenticatedFetch(`/api/teacher/games/dashboard${query}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        return { error: json?.error || `Failed to load dashboard (${res.status})` };
      }
      return {
        data: {
          classrooms: json.classrooms || [],
          savedGames: json.savedGames || [],
          activityGroups: json.activityGroups || [],
          competitions: json.competitions || [],
          studentSubmissions: json.studentSubmissions || []
        }
      };
    } catch (err: any) {
      return { error: err?.message || 'Failed to load teacher games dashboard.' };
    }
  }

  async updateGameAssignmentMeta(
    assignmentId: string,
    updates: { title?: string; dueDate?: string | null }
  ): Promise<{ assignment?: Assignment; error?: string }> {
    try {
      const res = await authenticatedFetch(`/api/games/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        return { error: json?.error || 'Failed to update assignment details.' };
      }
      return { assignment: json.assignment as Assignment };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update assignment details.' };
    }
  }

  async setChallengePublishStatus(
    challengeId: string,
    publish: boolean
  ): Promise<{ published?: boolean; error?: string }> {
    try {
      const res = await authenticatedFetch(`/api/classes/challenges/${challengeId}/publish-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish })
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        return { error: json?.error || 'Failed to update competition status.' };
      }
      return { published: Boolean(json.published) };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update competition status.' };
    }
  }
}

export interface TeacherDashboardClassroom {
  id: string;
  title: string;
  subject?: string;
  grade?: string;
}

export interface TeacherActivityAssignmentItem {
  assignmentId: string;
  classroomId: string;
  classroomTitle: string;
  classroomSubject?: string;
  classroomGrade?: string;
  libraryGameId: string | null;
  gameId: string;
  gameName: string;
  title: string;
  publicationStatus: 'Published' | 'Unpublished';
  published: boolean;
  dueDate: string | null;
  points: number;
  totalLevels: number;
  submissionsCount: number;
  completedCount: number;
  inProgressCount: number;
  totalStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherActivityGroup {
  groupKey: string;
  libraryGameId: string | null;
  isSavedLibraryGame: boolean;
  title: string;
  gameId: string;
  gameName: string;
  updatedAt: string;
  assignments: TeacherActivityAssignmentItem[];
  totalClassrooms: number;
  publishedCount: number;
  unpublishedCount: number;
  totalSubmissions: number;
  totalStudents: number;
}

export interface TeacherCompetitionActivity {
  challengeId: string;
  classroomId: string;
  classroomTitle: string;
  title: string;
  description: string;
  status: string;
  publicationStatus: 'Published' | 'Unpublished';
  published: boolean;
  maxMarks: number;
  deadlineAt: string | null;
  submissionsCount: number;
  completedCount: number;
  inProgressCount: number;
  totalStudents: number;
  createdAt: string;
}

export interface TeacherStudentSubmissionRow {
  rowId: string;
  itemType: 'game' | 'competition';
  activityId: string;
  libraryGameId: string | null;
  classroomId: string;
  classroomTitle: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentAvatar?: string | null;
  gameId: string;
  gameName: string;
  activityTitle: string;
  publicationStatus: 'Published' | 'Unpublished';
  status: 'Not Started' | 'In Progress' | 'Completed';
  scoreEarned: number | null;
  maxPoints: number;
  percentage: number | null;
  completedAt: string | null;
  timeTakenSeconds: number | null;
  completedLevelsCount?: number;
  totalLevels?: number;
  levelsCompleted?: Array<{
    levelId: string;
    levelNumber: number;
    title: string;
    scoreEarned: number;
    maxPoints: number;
    percentage: number;
    timeTakenSeconds?: number;
    completedAt?: string;
    details?: Record<string, any> | null;
  }>;
  levelsInProgress?: Array<Record<string, any>>;
  competitionDetails?: {
    submissionId: string;
    submissionType: string;
    wordCount: number | null;
    aiScore: number | null;
    finalScore: number | null;
    percentage: number | null;
    criteriaJson: any;
    aiFeedback: string | null;
    teacherAdjusted: boolean;
    teacherAdjustmentReason: string | null;
    submittedAt: string | null;
    evaluatedAt: string | null;
  } | null;
}

export interface TeacherGamesDashboardData {
  classrooms: TeacherDashboardClassroom[];
  savedGames: SavedLibraryGame[];
  activityGroups: TeacherActivityGroup[];
  competitions: TeacherCompetitionActivity[];
  studentSubmissions: TeacherStudentSubmissionRow[];
}

export const gameLibraryService = new GameLibraryService();
