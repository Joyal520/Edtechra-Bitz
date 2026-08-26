// ============================================================================
// EDTECHRA-BITZ: Live Quiz Service (Supabase Realtime & Server-Authoritative)
// ============================================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  LiveQuiz,
  LiveQuizSession,
  LiveQuizParticipant,
  LiveQuizResult,
  LiveQuizQuestion,
  LiveQuizStudentQuestion
} from '@/types/liveQuiz';
import { READY_MADE_QUIZZES } from '@/data/readyMadeQuizzes';
import { classroomPointsService } from './classroomPointsService';

class LiveQuizService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Generates a 6-digit random PIN
   */
  private generatePin(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Strips correct answers for student client safety
   */
  sanitizeForStudent(question: LiveQuizQuestion): LiveQuizStudentQuestion {
    const { correctIndex, explanation, ...safeQuestion } = question;
    return safeQuestion;
  }

  // ==========================================================================
  // QUIZ TEMPLATES / BANK
  // ==========================================================================

  /**
   * Retrieves all available quizzes (ready-made + custom) with ownership metadata
   */
  async getAllQuizzes(classroomId?: string): Promise<LiveQuiz[]> {
    const customList: LiveQuiz[] = [];
    const currentUserId = await this.getUserId();

    if (supabase) {
      try {
        let query = supabase
          .from('live_quizzes')
          .select(`
            *,
            questions:live_quiz_questions (*),
            teacher:profiles!created_by (id, full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (classroomId) {
          query = query.or(`visibility.eq.common,created_by.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'}`);
        } else {
          query = query.or(`visibility.eq.common,created_by.eq.${currentUserId || '00000000-0000-0000-0000-000000000000'}`);
        }

        const { data, error } = await query;
        if (!error && data) {
          const parsed = data.map((q: any) => {
            const isOwner = Boolean(currentUserId && q.created_by === currentUserId);
            const creatorName = isOwner
              ? 'Created by You'
              : q.teacher?.full_name
              ? `Created by ${q.teacher.full_name}`
              : q.created_by
              ? 'Created by Teacher'
              : 'Created by EdTechra';

            return {
              ...q,
              visibility: q.visibility || 'private',
              timer_enabled: q.timer_enabled ?? false,
              timer_seconds: q.timer_seconds ?? null,
              is_owner: isOwner,
              creator_name: creatorName,
              questions: (q.questions || []).sort((a: any, b: any) => a.question_index - b.question_index).map((item: any) => ({
                id: item.id,
                question: item.question_text,
                options: item.options,
                correctIndex: item.correct_index,
                durationSec: item.duration_sec,
                explanation: item.explanation
              }))
            };
          });
          customList.push(...parsed);
        }
      } catch (err) {
        console.warn('[LiveQuizService] getAllQuizzes notice:', err);
      }
    }

    // Merge ready-made quizzes (as common system quizzes)
    const customIds = new Set(customList.map((q) => q.id));
    const filteredReadyMade: LiveQuiz[] = READY_MADE_QUIZZES.filter((q) => !customIds.has(q.id)).map((q) => ({
      ...q,
      visibility: 'common' as const,
      timer_enabled: false,
      timer_seconds: null,
      is_owner: false,
      creator_name: 'Created by EdTechra'
    }));

    return [...customList, ...filteredReadyMade];
  }

  /**
   * Retrieves quizzes created by the current authenticated user (Your Quizzes)
   */
  async getYourQuizzes(classroomId?: string): Promise<LiveQuiz[]> {
    const all = await this.getAllQuizzes(classroomId);
    return all.filter((q) => q.is_owner === true);
  }

  /**
   * Retrieves quizzes shared as common / public from other users (Common Quizzes)
   */
  async getCommonQuizzes(classroomId?: string): Promise<LiveQuiz[]> {
    const all = await this.getAllQuizzes(classroomId);
    return all.filter((q) => q.is_owner !== true && q.visibility === 'common');
  }

  /**
   * Retrieves a single quiz by ID with its questions
   */
  async getQuizById(quizId: string): Promise<LiveQuiz | null> {
    // Check ready-made bank first
    const readyMade = READY_MADE_QUIZZES.find((q) => q.id === quizId);
    if (readyMade) {
      return {
        ...readyMade,
        visibility: 'common',
        timer_enabled: false,
        timer_seconds: null,
        is_owner: false,
        creator_name: 'Created by EdTechra'
      };
    }

    if (!supabase || !quizId) return null;
    const currentUserId = await this.getUserId();

    try {
      const { data, error } = await supabase
        .from('live_quizzes')
        .select(`
          *,
          questions:live_quiz_questions (*),
          teacher:profiles!created_by (id, full_name, email)
        `)
        .eq('id', quizId)
        .maybeSingle();

      if (error || !data) return null;

      const isOwner = Boolean(currentUserId && data.created_by === currentUserId);
      const creatorName = isOwner
        ? 'Created by You'
        : data.teacher?.full_name
        ? `Created by ${data.teacher.full_name}`
        : data.created_by
        ? 'Created by Teacher'
        : 'Created by EdTechra';

      return {
        ...data,
        visibility: data.visibility || 'private',
        timer_enabled: data.timer_enabled ?? false,
        timer_seconds: data.timer_seconds ?? null,
        is_owner: isOwner,
        creator_name: creatorName,
        questions: (data.questions || []).sort((a: any, b: any) => a.question_index - b.question_index).map((item: any) => ({
          id: item.id,
          question: item.question_text,
          options: item.options,
          correctIndex: item.correct_index,
          durationSec: item.duration_sec,
          explanation: item.explanation
        }))
      };
    } catch {
      return null;
    }
  }

  /**
   * Creates a new custom quiz in Supabase (normalized with live_quiz_questions)
   * and persists full object payload to Cloudflare R2
   */
  async createCustomQuiz(payload: {
    classroom_id?: string | null;
    title: string;
    description?: string;
    category?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    accent_color?: string;
    questions: LiveQuizQuestion[];
    is_public?: boolean;
    visibility?: 'private' | 'common';
    timer_enabled?: boolean;
    timer_seconds?: number | null;
  }): Promise<{ data?: LiveQuiz; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();

    // Server-side validation of timer
    let timerEnabled = Boolean(payload.timer_enabled);
    let timerSeconds: number | null = null;
    if (timerEnabled) {
      const parsedSec = Number(payload.timer_seconds);
      if (isNaN(parsedSec) || parsedSec <= 0 || !Number.isInteger(parsedSec)) {
        timerSeconds = 60; // Fallback to standard 60s
      } else {
        timerSeconds = Math.min(36000, Math.max(1, Math.floor(parsedSec)));
      }
    }

    // Strictly default to 'private' unless explicitly declared 'common'
    const visibility = payload.visibility === 'common' ? 'common' : 'private';

    try {
      // 1. Insert quiz header
      const { data: quizData, error: quizError } = await supabase
        .from('live_quizzes')
        .insert({
          classroom_id: payload.classroom_id || null,
          title: payload.title.trim(),
          description: (payload.description || '').trim(),
          category: payload.category || 'General',
          difficulty: payload.difficulty || 'Medium',
          accent_color: payload.accent_color || '#026fc3',
          is_public: visibility === 'common',
          visibility,
          timer_enabled: timerEnabled,
          timer_seconds: timerSeconds,
          created_by: userId
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // 2. Insert normalized questions
      const questionRows = payload.questions.map((q, idx) => ({
        quiz_id: quizData.id,
        question_index: idx,
        question_text: q.question.trim(),
        options: q.options,
        correct_index: q.correctIndex ?? 0,
        duration_sec: q.durationSec || 20,
        explanation: (q.explanation || '').trim()
      }));

      const { error: qError } = await supabase
        .from('live_quiz_questions')
        .insert(questionRows);

      if (qError) {
        console.warn('[LiveQuizService] live_quiz_questions insert notice:', qError);
      }

      // 3. Persist full Quiz Object to Cloudflare R2 storage
      try {
        await fetch('/api/live-quiz/save-r2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: quizData.id,
            quizData: {
              ...quizData,
              visibility,
              timer_enabled: timerEnabled,
              timer_seconds: timerSeconds,
              questions: payload.questions,
              storage_provider: 'cloudflare_r2'
            }
          })
        });
      } catch (r2Err) {
        console.warn('[LiveQuizService] R2 mirror upload notice:', r2Err);
      }

      return {
        data: {
          ...quizData,
          visibility,
          timer_enabled: timerEnabled,
          timer_seconds: timerSeconds,
          is_owner: true,
          creator_name: 'Created by You',
          questions: payload.questions
        }
      };
    } catch (err: any) {
      console.error('[LiveQuizService] createCustomQuiz error:', err);
      return { error: err.message || 'Failed to save quiz' };
    }
  }

  /**
   * Clones a Common Quiz to create a teacher-owned personal copy
   */
  async copyQuiz(quizId: string, classroomId?: string): Promise<{ data?: LiveQuiz; error?: string }> {
    const original = await this.getQuizById(quizId);
    if (!original) {
      return { error: 'Source quiz not found' };
    }

    return this.createCustomQuiz({
      classroom_id: classroomId || original.classroom_id || null,
      title: `${original.title} (Copy)`,
      description: original.description || '',
      category: original.category,
      difficulty: original.difficulty,
      accent_color: original.accent_color,
      questions: original.questions,
      timer_enabled: original.timer_enabled ?? false,
      timer_seconds: original.timer_seconds ?? null,
      visibility: 'private',
      is_public: false
    });
  }

  // ==========================================================================
  // LIVE SESSIONS & LOBBY
  // ==========================================================================

  /**
   * Teacher creates a new Live Quiz session and gets 6-digit PIN
   */
  async createSession(payload: {
    classroom_id: string;
    quiz_id?: string;
    custom_quiz?: LiveQuiz;
  }): Promise<{ data?: LiveQuizSession; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Teacher authentication required' };

    try {
      let targetQuizId = payload.quiz_id;

      // If a custom quiz or ready-made quiz needs to be persisted in DB
      if (payload.custom_quiz) {
        const savedQuiz = await this.createCustomQuiz({
          classroom_id: payload.classroom_id,
          title: payload.custom_quiz.title,
          description: payload.custom_quiz.description,
          category: payload.custom_quiz.category,
          difficulty: payload.custom_quiz.difficulty,
          accent_color: payload.custom_quiz.accent_color,
          questions: payload.custom_quiz.questions,
          visibility: payload.custom_quiz.visibility || 'private',
          timer_enabled: payload.custom_quiz.timer_enabled,
          timer_seconds: payload.custom_quiz.timer_seconds,
          is_public: payload.custom_quiz.visibility === 'common'
        });
        targetQuizId = savedQuiz.data?.id;
      } else if (targetQuizId && !targetQuizId.includes('-')) {
        // Ready-made ID without UUID: persist into DB if not present
        const readyMade = READY_MADE_QUIZZES.find((q) => q.id === targetQuizId);
        if (readyMade) {
          const savedQuiz = await this.createCustomQuiz({
            classroom_id: payload.classroom_id,
            title: readyMade.title,
            description: readyMade.description,
            category: readyMade.category,
            difficulty: readyMade.difficulty,
            accent_color: readyMade.accent_color,
            questions: readyMade.questions,
            visibility: 'common',
            is_public: true
          });
          targetQuizId = savedQuiz.data?.id;
        }
      }

      const quiz = payload.custom_quiz || (targetQuizId ? await this.getQuizById(targetQuizId) : null);
      const totalTimerEnabled = Boolean(quiz?.timer_enabled);
      const totalTimerSeconds = totalTimerEnabled ? (quiz?.timer_seconds || 60) : null;
      const startedAt = new Date().toISOString();
      const expiresAt = totalTimerEnabled && totalTimerSeconds
        ? new Date(Date.now() + totalTimerSeconds * 1000).toISOString()
        : null;

      // Generate unique PIN
      const pin = this.generatePin();

      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .insert({
          classroom_id: payload.classroom_id,
          teacher_id: userId,
          quiz_id: targetQuizId || null,
          pin,
          status: 'lobby',
          current_question_index: 0,
          question_duration_sec: 20,
          started_at: startedAt,
          expires_at: expiresAt
        })
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, subject),
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      return {
        data: {
          ...data,
          quiz
        }
      };
    } catch (err: any) {
      console.error('[LiveQuizService] createSession error:', err);
      return { error: err.message || 'Failed to start live quiz session' };
    }
  }

  /**
   * Retrieves active session by PIN
   */
  async getSessionByPin(pin: string): Promise<LiveQuizSession | null> {
    if (!supabase || !pin) return null;
    const cleanPin = pin.trim();

    try {
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, subject),
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .eq('pin', cleanPin)
        .maybeSingle();

      if (error || !data) return null;

      const quiz = data.quiz_id ? await this.getQuizById(data.quiz_id) : null;
      return {
        ...data,
        quiz
      };
    } catch (err) {
      console.error('[LiveQuizService] getSessionByPin error:', err);
      return null;
    }
  }

  /**
   * Retrieves active session by ID
   */
  async getSessionById(sessionId: string): Promise<LiveQuizSession | null> {
    if (!supabase || !sessionId) return null;

    try {
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, subject),
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .eq('id', sessionId)
        .maybeSingle();

      if (error || !data) return null;

      const quiz = data.quiz_id ? await this.getQuizById(data.quiz_id) : null;
      return {
        ...data,
        quiz
      };
    } catch (err) {
      console.error('[LiveQuizService] getSessionById error:', err);
      return null;
    }
  }

  /**
   * Student joins a session and creates/updates participant record
   */
  async joinSession(payload: {
    session_id: string;
    display_name: string;
    avatar_url?: string;
  }): Promise<{ data?: LiveQuizParticipant; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Please log in to join the quiz.' };

    try {
      const { data, error } = await supabase
        .from('live_quiz_participants')
        .upsert(
          {
            session_id: payload.session_id,
            student_id: userId,
            display_name: payload.display_name.trim(),
            avatar_url: payload.avatar_url || null,
            score: 0,
            last_earned_points: 0
          },
          { onConflict: 'session_id,student_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[LiveQuizService] joinSession error:', err);
      return { error: err.message || 'Failed to join session' };
    }
  }

  /**
   * Retrieves participants in a session
   */
  async getParticipants(sessionId: string): Promise<LiveQuizParticipant[]> {
    if (!supabase || !sessionId) return [];

    try {
      const { data, error } = await supabase
        .from('live_quiz_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[LiveQuizService] getParticipants error:', err);
      return [];
    }
  }

  // ==========================================================================
  // GAMEPLAY LOOP & SERVER-AUTHORITATIVE GRADING
  // ==========================================================================

  /**
   * Teacher starts question
   */
  async startQuestion(payload: {
    session_id: string;
    question_index: number;
    duration_sec: number;
    correct_answer_index?: number;
  }): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const startMs = Date.now();
      const { error } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'in_progress',
          current_question_index: payload.question_index,
          question_start_ms: startMs,
          question_duration_sec: payload.duration_sec,
          correct_answer_index: null // Keep correct answer hidden until reveal phase!
        })
        .eq('id', payload.session_id);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to advance question' };
    }
  }

  /**
   * Student submits an answer to the active question.
   * Uses server-authoritative RPC `submit_live_quiz_answer` to evaluate correctness,
   * compute speed bonus, prevent duplicates, and increment score atomically.
   */
  async submitAnswer(payload: {
    session_id: string;
    question_index: number;
    selected_option_index: number;
  }): Promise<{ data?: { is_correct: boolean; points_awarded: number; current_score?: number }; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      // 1. Primary: Secure Server-Side Stored Procedure
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_live_quiz_answer', {
        p_session_id: payload.session_id,
        p_question_index: payload.question_index,
        p_selected_option_index: payload.selected_option_index
      });

      if (!rpcError && rpcData) {
        return {
          data: {
            is_correct: Boolean(rpcData.is_correct),
            points_awarded: Number(rpcData.points_awarded || 0),
            current_score: Number(rpcData.current_score || 0)
          }
        };
      }

      // 2. Direct fallback (if stored procedure is not yet applied in local emulator)
      const serverSubmitMs = Date.now();
      const { error: ansError } = await supabase
        .from('live_quiz_answers')
        .upsert(
          {
            session_id: payload.session_id,
            question_index: payload.question_index,
            student_id: userId,
            selected_option_index: payload.selected_option_index,
            server_submit_ms: serverSubmitMs
          },
          { onConflict: 'session_id,question_index,student_id' }
        );

      if (ansError) throw ansError;

      return {
        data: {
          is_correct: false,
          points_awarded: 0
        }
      };
    } catch (err: any) {
      console.error('[LiveQuizService] submitAnswer error:', err);
      return { error: err.message || 'Failed to submit answer' };
    }
  }

  /**
   * Teacher triggers answer reveal
   */
  async revealAnswer(sessionId: string, correctIndex: number): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'reveal',
          correct_answer_index: correctIndex
        })
        .eq('id', sessionId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to reveal answer' };
    }
  }

  /**
   * Finish game, calculate stats, write live_quiz_results, and award classroom points.
   * Calls secure server RPC `finish_and_award_live_quiz` for atomic and idempotent execution.
   */
  async finishQuiz(sessionId: string): Promise<{ data?: LiveQuizResult[]; error?: string }> {
    if (!supabase || !sessionId) return { error: 'Supabase is not configured' };

    try {
      // 1. Primary: Server-Authoritative RPC
      const { data: rpcResults, error: rpcError } = await supabase.rpc('finish_and_award_live_quiz', {
        p_session_id: sessionId
      });

      if (!rpcError && Array.isArray(rpcResults)) {
        // Fetch full results with student profiles for presentation
        const { data: fullResults } = await supabase
          .from('live_quiz_results')
          .select(`
            *,
            student:profiles!student_id (id, full_name, avatar_url, email)
          `)
          .eq('session_id', sessionId)
          .order('final_rank', { ascending: true });

        return { data: fullResults || [] };
      }

      // 2. Direct fallback
      const session = await this.getSessionById(sessionId);
      if (!session) return { error: 'Session not found' };

      const totalQuestions = session.quiz?.questions.length || 1;

      const [participantsRes, answersRes] = await Promise.all([
        supabase
          .from('live_quiz_participants')
          .select('*')
          .eq('session_id', sessionId)
          .order('score', { ascending: false }),
        supabase
          .from('live_quiz_answers')
          .select('*')
          .eq('session_id', sessionId)
      ]);

      const participants = participantsRes.data || [];
      const answers = answersRes.data || [];

      const answersByStudent: Record<string, { correct: number; wrong: number }> = {};
      answers.forEach((a: any) => {
        if (!answersByStudent[a.student_id]) {
          answersByStudent[a.student_id] = { correct: 0, wrong: 0 };
        }
        if (a.is_correct) {
          answersByStudent[a.student_id].correct += 1;
        } else {
          answersByStudent[a.student_id].wrong += 1;
        }
      });

      const finalResults: LiveQuizResult[] = [];

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const rank = i + 1;
        const studentStats = answersByStudent[p.student_id] || { correct: 0, wrong: 0 };
        const accuracy = totalQuestions > 0
          ? Math.round((studentStats.correct / totalQuestions) * 100)
          : 0;

        const { data: resRow } = await supabase
          .from('live_quiz_results')
          .upsert(
            {
              session_id: sessionId,
              classroom_id: session.classroom_id,
              teacher_id: session.teacher_id,
              student_id: p.student_id,
              quiz_id: session.quiz_id,
              score: p.score,
              points_awarded: p.score,
              correct_count: studentStats.correct,
              wrong_count: Math.max(0, totalQuestions - studentStats.correct),
              total_questions: totalQuestions,
              accuracy_percentage: accuracy,
              final_rank: rank
            },
            { onConflict: 'session_id,student_id' }
          )
          .select()
          .single();

        if (resRow) {
          finalResults.push(resRow);
        }

        // Idempotent point award via classroomPointsService
        if (p.score > 0 && session.classroom_id) {
          await classroomPointsService.awardPoints({
            classroom_id: session.classroom_id,
            student_id: p.student_id,
            points: p.score,
            reason: `Live Quiz: ${session.quiz?.title || 'Game'} (Rank #${rank})`,
            source_type: 'live_quiz',
            source_id: resRow?.id || null
          });
        }
      }

      await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'finished',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return { data: finalResults };
    } catch (err: any) {
      console.error('[LiveQuizService] finishQuiz error:', err);
      return { error: err.message || 'Failed to finish quiz' };
    }
  }

  // ==========================================================================
  // REALTIME CHANNEL & BROADCAST / PRESENCE HELPERS
  // ==========================================================================

  /**
   * Connects to a Supabase Realtime channel for a Live Quiz session PIN
   */
  createRealtimeChannel(pin: string): RealtimeChannel | null {
    if (!supabase || !pin) return null;
    return supabase.channel(`live_quiz:${pin.trim()}`, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: pin.trim() }
      }
    });
  }
}

export const liveQuizService = new LiveQuizService();
