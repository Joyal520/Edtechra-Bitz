import { authenticatedFetch } from '@/lib/apiAuth';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/types/classroom';
import type {
  GameAssignmentSettings,
  GameCatalogItem,
  GameCompletionPayload,
  GameConfig,
  GameId,
  GameSubmissionResponse
} from '@/types/gameLibrary';

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'liquid-sentences',
    name: 'Liquid Sentences',
    shortDescription:
      'Students arrange scrambled words into meaningful sentences with optional hints and fluid animations.',
    category: 'Grammar & Syntax',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_6i2hc86i2hc86i2h.jpg',
    accentColor: 'from-cyan-500 to-blue-600',
    badgeLabel: 'Sentence Builder',
    htmlPath: '/games/liquid-sentences.html',
    defaultPoints: 100
  },
  {
    id: 'save-the-balloon',
    name: 'Save the Balloon',
    shortDescription:
      'Guess letters to uncover each secret word before the balloon floats away, with custom clues and difficulty.',
    category: 'Vocabulary & Spelling',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_41exj441exj441ex.jpg',
    accentColor: 'from-rose-500 to-amber-500',
    badgeLabel: 'Word Rescue',
    htmlPath: '/games/save-the-balloon.html',
    defaultPoints: 100
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    shortDescription:
      'Flip cards to pair vocabulary terms with definitions or uploaded pictures in a timed matching challenge.',
    category: 'Recall & Matching',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_ezubsaezubsaezub.jpg',
    accentColor: 'from-violet-500 to-fuchsia-600',
    badgeLabel: 'Card Pairs',
    htmlPath: '/games/memory-match.html',
    defaultPoints: 100
  },
  {
    id: 'classroom-jigsaw',
    name: 'Classroom Jigsaw',
    shortDescription:
      'Upload one or more classroom images and turn them into interactive jigsaw puzzles at your chosen grid size.',
    category: 'Visual & Spatial',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_oocop3oocop3ooco.jpg',
    accentColor: 'from-emerald-500 to-teal-600',
    badgeLabel: 'Visual Puzzle',
    htmlPath: '/games/classroom-jigsaw.html',
    defaultPoints: 100
  },
  {
    id: 'lumina-words',
    name: 'Lumina Words',
    shortDescription:
      'Swipe connected letters on the glowing wheel to solve a custom crossword generated from your words and clues.',
    category: 'Spelling & Wordplay',
    thumbnailUrl: '/games/thumbnails/Gemini_Generated_Image_8kpi9b8kpi9b8kpi.jpg',
    accentColor: 'from-indigo-500 to-purple-600',
    badgeLabel: 'Word Wheel',
    htmlPath: '/games/lumina-words.html',
    defaultPoints: 100
  }
];

export function getGameCatalogItem(gameId: GameId): GameCatalogItem {
  return GAME_CATALOG.find((g) => g.id === gameId) || GAME_CATALOG[0];
}

export function getDefaultConfigForGame(gameId: GameId): GameConfig {
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
        title: 'Classroom Picture Puzzle'
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
  }
}

export interface TeacherClassroomOption {
  id: string;
  name: string;
  subject?: string | null;
  grade_level?: string | null;
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
      .eq('user_id', user.id)
      .in('role', ['teacher', 'co_teacher'])
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

  async createGameAssignment(params: {
    classroomId: string;
    gameId: GameId;
    title: string;
    points: number;
    dueDate?: string | null;
    instructions?: string;
    config: GameConfig;
  }): Promise<{ data?: Assignment; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Authentication required' };

    const catalogItem = getGameCatalogItem(params.gameId);
    const settings: GameAssignmentSettings = {
      is_game_library: true,
      game_id: params.gameId,
      game_name: catalogItem.name,
      game_config: params.config
    };

    const cleanInstructions =
      (params.instructions || '').trim() ||
      `Play ${catalogItem.name}: "${params.title.trim()}". Complete the game to earn up to ${params.points} points on the classroom leaderboard.`;

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: params.classroomId,
          title: params.title.trim(),
          instructions: cleanInstructions,
          assignment_type: 'activity',
          points: Math.max(1, Math.round(params.points || 100)),
          due_date: params.dueDate || null,
          attachment_urls: [],
          settings,
          created_by: user.id,
          status: 'published'
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as Assignment };
    } catch (err: any) {
      console.error('[GameLibraryService] createGameAssignment error:', err);
      return { error: err?.message || 'Failed to publish game assignment.' };
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
}

export const gameLibraryService = new GameLibraryService();
