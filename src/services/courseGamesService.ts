// ============================================================================
// EDTECHRA COURSE STUDIO: GAMES & COMPETITIONS CLIENT SERVICE
// ============================================================================

import { authenticatedFetch } from '@/lib/apiAuth';
import type {
  CourseGame,
  CourseGameAnalytics,
  CourseGameAssignment,
  CourseGameAttempt,
  CourseGameQuestion,
  CourseGameQuestionType,
  CourseGameSourceMaterial,
  GameDifficulty
} from '@/types/courseGames';

class CourseGamesService {
  async listGames(courseId?: string): Promise<CourseGame[]> {
    const qs = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    const res = await authenticatedFetch(`/api/course-games${qs}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load course games');
    }
    return json.data || [];
  }

  async getGame(id: string): Promise<CourseGame> {
    const res = await authenticatedFetch(`/api/course-games/${id}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load game details');
    }
    return json.data;
  }

  async createGame(payload: Partial<CourseGame> & { questions?: CourseGameQuestion[] }): Promise<CourseGame> {
    const res = await authenticatedFetch('/api/course-games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create course game');
    }
    return json.data;
  }

  async updateGame(id: string, payload: Partial<CourseGame> & { questions?: CourseGameQuestion[] }): Promise<CourseGame> {
    const res = await authenticatedFetch(`/api/course-games/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course game');
    }
    return json.data;
  }

  async deleteGame(id: string): Promise<void> {
    const res = await authenticatedFetch(`/api/course-games/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete game');
    }
  }

  async generateQuestions(params: {
    materials: CourseGameSourceMaterial[];
    count: number;
    difficulty: GameDifficulty;
    questionTypes: CourseGameQuestionType[];
    targetLevel: string;
    topic?: string;
    learningObjective?: string;
    pointsPerQuestion?: number;
  }): Promise<{ questions: CourseGameQuestion[]; attributedMaterials: CourseGameSourceMaterial[] }> {
    const res = await authenticatedFetch('/api/course-games/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'AI question generation failed');
    }
    return json.data;
  }

  async assignToClassrooms(
    gameId: string,
    payload: {
      classroomIds: string[];
      participantIds?: string[];
      startDate?: string | null;
      endDate?: string | null;
      timeLimitSec?: number;
      maxAttempts?: number;
      visibility?: 'classroom' | 'selected_students' | 'public';
      publicLeaderboard?: boolean;
      createLiveQuiz?: boolean;
    }
  ): Promise<{ assignments: CourseGameAssignment[]; live_quiz_id?: string | null }> {
    const res = await authenticatedFetch(`/api/course-games/${gameId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to assign game to classroom');
    }
    return {
      assignments: json.data || [],
      live_quiz_id: json.live_quiz_id || null
    };
  }

  async getPlaySession(gameAssignmentId: string): Promise<{
    assignment: CourseGameAssignment;
    game: CourseGame;
    questions: CourseGameQuestion[];
    attempts: CourseGameAttempt[];
    leaderboard: {
      student_id: string;
      full_name: string;
      team_name?: string | null;
      score: number;
      accuracy_pct: number;
      time_taken_sec: number;
    }[];
  }> {
    const res = await authenticatedFetch(`/api/course-games/play/${gameAssignmentId}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load game session');
    }
    return json.data;
  }

  async submitAttempt(
    gameAssignmentId: string,
    payload: {
      answers: Record<string, any>;
      timeTakenSec: number;
      teamName?: string | null;
    }
  ): Promise<{
    attempt: CourseGameAttempt;
    recommendations: string[];
    points_awarded_delta: number;
  }> {
    const res = await authenticatedFetch(`/api/course-games/submit/${gameAssignmentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to submit game answers');
    }
    return json.data;
  }

  async getAnalytics(gameId: string): Promise<CourseGameAnalytics> {
    const res = await authenticatedFetch(`/api/course-games/${gameId}/analytics`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to load game analytics');
    }
    return json.data;
  }
}

export const courseGamesService = new CourseGamesService();
