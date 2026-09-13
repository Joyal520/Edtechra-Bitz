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
  LiveQuizStudentQuestion,
  EffectiveLiveQuizState
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
              cover_image: q.cover_image || q.cover_image_url || null,
              cover_image_url: q.cover_image_url || q.cover_image || null,
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

      let questionsList = (data.questions || []).sort((a: any, b: any) => a.question_index - b.question_index).map((item: any) => ({
        id: item.id,
        question: item.question_text,
        options: item.options,
        correctIndex: item.correct_index,
        durationSec: item.duration_sec,
        explanation: item.explanation
      }));

      // RLS Fallback for students: if direct query returned no questions, fetch via security definer RPC
      if (questionsList.length === 0) {
        try {
          const { data: studentQuestions, error: rpcErr } = await supabase.rpc('get_live_quiz_questions_for_student', {
            p_quiz_id: quizId
          });
          if (!rpcErr && Array.isArray(studentQuestions) && studentQuestions.length > 0) {
            questionsList = studentQuestions.sort((a: any, b: any) => (a.question_index ?? 0) - (b.question_index ?? 0)).map((item: any) => ({
              id: item.id,
              question: item.question_text,
              options: item.options,
              correctIndex: -1, // hidden from students
              durationSec: item.duration_sec || 20,
              explanation: ''
            }));
          }
        } catch (rpcEx) {
          console.warn('[LiveQuizService] Student RPC questions fallback notice:', rpcEx);
        }
      }

      return {
        ...data,
        visibility: data.visibility || 'private',
        timer_enabled: data.timer_enabled ?? false,
        timer_seconds: data.timer_seconds ?? null,
        is_owner: isOwner,
        creator_name: creatorName,
        questions: questionsList
      };
    } catch {
      return null;
    }
  }

  /**
   * Specifically loads sanitized questions for students via RPC or bank
   */
  async getStudentQuestions(quizId: string): Promise<LiveQuizStudentQuestion[]> {
    const readyMade = READY_MADE_QUIZZES.find((q) => q.id === quizId);
    if (readyMade) {
      return readyMade.questions.map((q) => this.sanitizeForStudent(q));
    }
    if (!supabase || !quizId) return [];
    try {
      const { data, error } = await supabase.rpc('get_live_quiz_questions_for_student', {
        p_quiz_id: quizId
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.sort((a: any, b: any) => (a.question_index ?? 0) - (b.question_index ?? 0)).map((item: any) => ({
          id: item.id,
          question: item.question_text,
          options: item.options,
          durationSec: item.duration_sec || 20
        }));
      }
    } catch (err) {
      console.warn('[LiveQuizService] getStudentQuestions error:', err);
    }
    // Fallback: try getQuizById and sanitize
    const quiz = await this.getQuizById(quizId);
    return (quiz?.questions || []).map((q) => this.sanitizeForStudent(q));
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
    cover_image?: string | null;
    cover_image_url?: string | null;
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
    const coverImage = (payload.cover_image || payload.cover_image_url || '').trim() || null;

    // Title Duplicate Protection: Normalize title (trim, collapse spaces, lowercase)
    const normalizedNewTitle = payload.title.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalizedNewTitle) {
      return { error: 'Please provide a valid quiz title.' };
    }

    if (userId) {
      try {
        const { data: userQuizzes, error: checkErr } = await supabase
          .from('live_quizzes')
          .select('id, title')
          .eq('created_by', userId);

        if (!checkErr && userQuizzes) {
          const isDuplicate = userQuizzes.some((q) => {
            const existingNorm = (q.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
            return existingNorm === normalizedNewTitle;
          });

          if (isDuplicate) {
            return { error: 'A quiz with this title already exists. Please choose a different title.' };
          }
        }
      } catch (checkErr) {
        console.warn('[LiveQuizService] Duplicate title check notice:', checkErr);
      }
    }

    // Option length validation (1-3 words per choice, exactly 4 choices, no "all/none of above")
    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return { error: 'Please provide at least 1 question for the quiz.' };
    }

    for (let i = 0; i < payload.questions.length; i++) {
      const q = payload.questions[i];
      const qNum = i + 1;
      let opts: string[] = [];
      if (Array.isArray(q.options)) {
        opts = q.options.map(String);
      } else if (typeof q.options === 'string') {
        try { opts = JSON.parse(q.options); } catch { opts = []; }
      }

      if (opts.length !== 4) {
        return { error: `Question ${qNum} must have exactly 4 choices (found ${opts.length}).` };
      }

      for (let j = 0; j < opts.length; j++) {
        const optText = (opts[j] || '').trim();
        const words = optText.split(/\s+/).filter(Boolean);
        if (words.length < 1) {
          return { error: `Question ${qNum}, choice ${j + 1} cannot be empty.` };
        }
        if (words.length > 3) {
          return {
            error: `Question ${qNum}, choice "${optText}" has ${words.length} words. Every choice must contain between 1 and 3 words.`
          };
        }
        if (/^(all|none)\s+of\s+the\s+above$/i.test(optText)) {
          return {
            error: `Question ${qNum}, choice "${optText}" is forbidden. Never use "All of the above" or "None of the above".`
          };
        }
      }
    }

    try {
      // 1. Insert quiz header (with fallback if cover_image column not yet migrated)
      const baseInsertPayload = {
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
      };

      let quizData: any = null;
      let quizError: any = null;

      if (coverImage) {
        const attempt = await supabase
          .from('live_quizzes')
          .insert({
            ...baseInsertPayload,
            cover_image: coverImage
          })
          .select()
          .single();
        quizData = attempt.data;
        quizError = attempt.error;
      }

      if (!quizData && (!coverImage || quizError)) {
        const fallbackAttempt = await supabase
          .from('live_quizzes')
          .insert(baseInsertPayload)
          .select()
          .single();
        quizData = fallbackAttempt.data;
        quizError = fallbackAttempt.error;
      }

      if (quizError) throw quizError;

      // 2. Insert normalized questions
      const questionRows = payload.questions.map((q, idx) => ({
        quiz_id: quizData.id,
        question_index: idx,
        question_text: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        duration_sec: q.durationSec || 20,
        explanation: q.explanation || null
      }));

      const { error: questionsError } = await supabase
        .from('live_quiz_questions')
        .insert(questionRows);

      if (questionsError) {
        console.warn('live_quiz_questions batch insert error:', questionsError.message);
      }

      // 3. Persist to Cloudflare R2 backup
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
          cover_image: coverImage || quizData.cover_image || null,
          cover_image_url: coverImage || quizData.cover_image || null,
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
      if (
        err?.code === '23505' ||
        err?.message?.includes('duplicate key') ||
        err?.message?.includes('idx_live_quizzes_owner_norm_title') ||
        err?.message?.includes('already exists')
      ) {
        return { error: 'A quiz with this title already exists. Please choose a different title.' };
      }
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
  // LIVE SESSIONS, SCHEDULING & STATE MANAGEMENT
  // ==========================================================================

  /**
   * Deterministically calculates the effective lifecycle state of a Live Quiz session:
   * 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'
   */
  getEffectiveSessionState(session: LiveQuizSession | null | undefined): EffectiveLiveQuizState {
    if (!session) return 'draft';
    if (session.status === 'cancelled') return 'cancelled';
    if (session.status === 'finished' || (session.status as string) === 'completed') return 'completed';
    if (session.status === 'draft') return 'draft';

    // Staleness guard: sessions created > 2 hours ago without activity are considered completed/expired
    if (session.created_at) {
      const ageMs = Date.now() - new Date(session.created_at).getTime();
      if (ageMs > 2 * 60 * 60 * 1000) {
        return 'completed';
      }
    }

    if (session.status === 'lobby') {
      if (session.started_at) {
        return 'scheduled';
      }
      return 'lobby';
    }

    if (session.status === 'in_progress' || session.status === 'reveal') {
      return 'live';
    }

    return 'draft';
  }

  /**
   * Teacher creates a new Live Quiz session (immediate or scheduled)
   */
  async createSession(payload: {
    classroom_id: string;
    quiz_id?: string;
    custom_quiz?: LiveQuiz;
    is_scheduled?: boolean;
    scheduled_start_at?: string;
  }): Promise<{ data?: LiveQuizSession; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Teacher authentication required' };

    try {
      // Stale session cleanup & idempotency guard:
      const existing = await this.getActiveSessionForClassroom(payload.classroom_id);
      if (existing) {
        const isSameQuiz = (payload.quiz_id && existing.quiz_id === payload.quiz_id) ||
          (payload.custom_quiz?.id && existing.quiz_id === payload.custom_quiz.id);
        const ageMs = existing.created_at ? Date.now() - new Date(existing.created_at).getTime() : 0;

        // Double-click protection: if an identical fresh lobby session was just created (< 3 minutes ago), reuse it
        if (existing.status === 'lobby' && isSameQuiz && ageMs < 3 * 60 * 1000 && !payload.is_scheduled) {
          return { data: existing };
        }

        // Otherwise (stale session, different quiz, or abandoned in-progress session), supersede and cancel the old session
        try {
          await supabase
            .from('live_quiz_sessions')
            .update({ status: 'cancelled', ended_at: new Date().toISOString() })
            .eq('id', existing.id);
        } catch (cleanErr) {
          console.warn('[LiveQuizService] Notice cleaning up stale session:', cleanErr);
        }
      }

      // Target Quiz Reference:
      // If quiz_id is provided or custom_quiz already has an ID, reference it directly (NEVER CLONE)
      let targetQuizId = payload.quiz_id || payload.custom_quiz?.id;
      const searchId = targetQuizId?.toLowerCase();
      const readyMade = searchId
        ? READY_MADE_QUIZZES.find((q) => q.id === searchId || q.title.toLowerCase() === searchId)
        : null;

      // Only persist if custom_quiz was passed WITHOUT any ID (i.e. brand new unsaved quiz)
      if (!targetQuizId && payload.custom_quiz) {
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
        if (savedQuiz.error) {
          return { error: savedQuiz.error };
        }
        targetQuizId = savedQuiz.data?.id;
      } else if (readyMade) {
        // Ready-made ID: find existing persisted row in live_quizzes with questions to prevent duplicates
        const { data: existingReady } = await supabase
          .from('live_quizzes')
          .select('id, live_quiz_questions(id)')
          .eq('title', readyMade.title)
          .limit(1);

        if (existingReady && existingReady.length > 0 && (existingReady[0] as any).live_quiz_questions?.length > 0) {
          targetQuizId = existingReady[0].id;
        } else {
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
          if (savedQuiz.data?.id) {
            targetQuizId = savedQuiz.data.id;
          }
        }
      }

      const quiz = payload.custom_quiz || (targetQuizId ? await this.getQuizById(targetQuizId) : null) || (readyMade ? { ...readyMade, id: targetQuizId || readyMade.id } : null);
      const totalTimerEnabled = Boolean(quiz?.timer_enabled);
      const totalTimerSeconds = totalTimerEnabled ? (quiz?.timer_seconds || 60) : null;
      const isScheduled = Boolean(payload.is_scheduled && payload.scheduled_start_at);
      const scheduledStartAt = isScheduled ? payload.scheduled_start_at! : null;
      // For Launch Now: started_at MUST be null until teacher clicks Start Quiz
      // For Scheduled: started_at stores the future scheduled start time
      const startedAt = isScheduled ? scheduledStartAt : null;
      const expiresAt = totalTimerEnabled && totalTimerSeconds
        ? new Date(Date.now() + totalTimerSeconds * 1000).toISOString()
        : null;

      // Generate unique PIN
      const pin = this.generatePin();

      const firstQDuration = quiz?.questions?.[0]?.durationSec || 20;

      // Clean insertion row matching live_quiz_sessions table schema & check constraints
      // Note: started_at stores the future scheduled time for scheduled sessions
      // We do not include scheduled_start_at in the DB insert to maintain 100% compatibility with production tables
      const insertRow: any = {
        classroom_id: payload.classroom_id,
        teacher_id: userId,
        quiz_id: targetQuizId || null,
        pin,
        status: 'lobby',
        current_question_index: 0,
        question_duration_sec: firstQDuration,
        started_at: startedAt,
        expires_at: expiresAt
      };

      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .insert(insertRow)
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
          scheduled_start_at: scheduledStartAt || data.started_at,
          quiz
        }
      };
    } catch (err: any) {
      console.error('[LiveQuizService] createSession error:', err);
      return { error: err.message || 'Failed to start live quiz session' };
    }
  }

  /**
   * Schedules a live quiz session for a future date/time
   */
  async scheduleSession(payload: {
    classroom_id: string;
    quiz_id?: string;
    custom_quiz?: LiveQuiz;
    scheduled_start_at: string;
  }): Promise<{ data?: LiveQuizSession; error?: string }> {
    return this.createSession({
      ...payload,
      is_scheduled: true,
      scheduled_start_at: payload.scheduled_start_at
    });
  }

  /**
   * Cancels an active or scheduled Live Quiz session
   */
  async cancelSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase || !sessionId) return { success: false, error: 'Session ID required' };
    try {
      const { data: session } = await supabase
        .from('live_quiz_sessions')
        .select('id, pin, classroom_id')
        .eq('id', sessionId)
        .maybeSingle();

      const { error } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'cancelled',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      if (session?.pin) {
        try {
          const channel = this.createRealtimeChannel(session.pin);
          if (channel) {
            channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                await channel.send({
                  type: 'broadcast',
                  event: 'quiz_cancelled',
                  payload: { sessionId }
                });
                supabase?.removeChannel(channel);
              }
            });
          }
        } catch {
          // ignore channel error
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[LiveQuizService] cancelSession error:', err);
      return { success: false, error: err.message || 'Failed to cancel session' };
    }
  }

  /**
   * Authoritatively starts Question 1 for a session, transitioning status to 'in_progress'
   */
  async startSession(
    sessionId: string,
    classroomId: string,
    _totalQuestions: number = 0
  ): Promise<{ success: boolean; session?: LiveQuizSession | null; error?: string }> {
    if (!sessionId) return { success: false, error: 'Session ID is required' };

    const startMs = Date.now();
    let updatedSession: LiveQuizSession | null = null;
    let initialDurationSec = 20;
    try {
      const existingSession = await this.getSessionById(sessionId);
      if (existingSession?.quiz?.questions?.[0]?.durationSec) {
        initialDurationSec = existingSession.quiz.questions[0].durationSec;
      }
    } catch {}

    // 1. Direct Supabase update (Immediate for teacher / session owner)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('live_quiz_sessions')
          .update({
            status: 'in_progress',
            started_at: new Date(startMs).toISOString(),
            current_question_index: 0,
            question_start_ms: startMs,
            question_duration_sec: initialDurationSec,
            correct_answer_index: null
          })
          .eq('id', sessionId)
          .select(`
            *,
            classroom:classrooms!classroom_id (id, title, subject),
            teacher:profiles!teacher_id (id, full_name, avatar_url)
          `)
          .maybeSingle();

        if (!error && data) {
          const quiz = data.quiz_id ? await this.getQuizById(data.quiz_id) : null;
          updatedSession = { ...data, quiz };
        }
      } catch (err) {
        console.warn('[LiveQuizService] Direct supabase startSession update notice:', err);
      }
    }

    // 2. Also invoke backend authoritative reconciliation endpoint with auth token
    try {
      const { data: authSessionData } = (await supabase?.auth.getSession()) || { data: { session: null } };
      const token = authSessionData.session?.access_token;
      const cleanClassroomId = classroomId && classroomId !== 'undefined' && classroomId !== 'null' ? classroomId : 'all';

      const response = await fetch(`/api/classes/${cleanClassroomId}/live-quiz/sessions/${sessionId}/reconcile-scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'start_now' })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.session) {
          updatedSession = json.session;
        }
      }
    } catch {
      // Backend optional
    }

    return { success: true, session: updatedSession };
  }

  /**
   * Reconciles a scheduled session that has reached its start time
   */
  async reconcileScheduledSession(sessionId: string, classroomId?: string): Promise<LiveQuizSession | null> {
    if (!sessionId) return null;

    try {
      const { data: authSessionData } = (await supabase?.auth.getSession()) || { data: { session: null } };
      const token = authSessionData.session?.access_token;
      const cleanClassroomId = classroomId && classroomId !== 'undefined' && classroomId !== 'null' ? classroomId : 'all';

      // First try backend authoritative reconciliation endpoint with Bearer auth token
      const response = await fetch(`/api/classes/${cleanClassroomId}/live-quiz/sessions/${sessionId}/reconcile-scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.session) {
          let sessionObj = json.session;
          if (sessionObj.quiz_id && (!sessionObj.quiz?.questions || sessionObj.quiz.questions.length === 0)) {
            const fullQuiz = await this.getQuizById(sessionObj.quiz_id);
            sessionObj = { ...sessionObj, quiz: fullQuiz || sessionObj.quiz };
          } else if (sessionObj.quiz?.questions) {
            sessionObj.quiz.questions = (sessionObj.quiz.questions || []).map((item: any) => ({
              id: item.id,
              question: item.question_text || item.question,
              options: Array.isArray(item.options) ? item.options : (typeof item.options === 'string' ? JSON.parse(item.options) : []),
              correctIndex: typeof item.correct_index === 'number' ? item.correct_index : item.correctIndex,
              durationSec: item.duration_sec || item.durationSec || 20,
              explanation: item.explanation
            }));
          }
          return sessionObj;
        }
      }
    } catch {
      // Backend not reached or offline, fallback to client Supabase transition
    }

    if (!supabase) return null;
    try {
      const startMs = Date.now();
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'in_progress',
          current_question_index: 0,
          question_start_ms: startMs,
          question_duration_sec: 20
        })
        .eq('id', sessionId)
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, subject),
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .maybeSingle();

      if (!error && data) {
        const quiz = data.quiz_id ? await this.getQuizById(data.quiz_id) : null;
        return { ...data, quiz };
      }
    } catch (err) {
      console.warn('[LiveQuizService] Client reconcile fallback notice:', err);
    }

    // Direct read fallback: if already in_progress or scheduled, return session with quiz
    return this.getSessionById(sessionId);
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
   * Computes the deterministic timeline state of a Live Quiz session based on start timestamp
   * and question durations (with 3.5s reveal per question).
   */
  computeSessionTimeline(
    session: LiveQuizSession,
    questions: LiveQuizQuestion[],
    nowMs: number = Date.now()
  ): {
    status: 'scheduled' | 'in_progress' | 'reveal' | 'finished';
    current_question_index: number;
    question_start_ms: number;
    question_duration_sec: number;
    correct_answer_index: number | null;
    ended_at?: string;
  } {
    const startedAt = session.started_at || session.scheduled_start_at;
    const startMs = startedAt ? new Date(startedAt).getTime() : nowMs;

    if (nowMs < startMs) {
      return {
        status: 'scheduled',
        current_question_index: 0,
        question_start_ms: startMs,
        question_duration_sec: session.question_duration_sec || 20,
        correct_answer_index: null
      };
    }

    const sortedQuestions = Array.isArray(questions) ? questions : [];
    if (sortedQuestions.length === 0) {
      return {
        status: (session.status as any) || 'in_progress',
        current_question_index: session.current_question_index ?? 0,
        question_start_ms: session.question_start_ms || startMs,
        question_duration_sec: session.question_duration_sec || 20,
        correct_answer_index: session.correct_answer_index ?? null
      };
    }

    const REVEAL_DURATION_MS = 3500;
    let cumulativeMs = 0;

    for (let i = 0; i < sortedQuestions.length; i++) {
      const q = sortedQuestions[i];
      const durSec = q.durationSec || session.question_duration_sec || 20;
      const durMs = durSec * 1000;
      const qStartMs = startMs + cumulativeMs;
      const qEndMs = qStartMs + durMs;
      const revealEndMs = qEndMs + REVEAL_DURATION_MS;

      if (nowMs < qEndMs) {
        return {
          status: 'in_progress',
          current_question_index: i,
          question_start_ms: qStartMs,
          question_duration_sec: durSec,
          correct_answer_index: null
        };
      } else if (nowMs < revealEndMs) {
        return {
          status: 'reveal',
          current_question_index: i,
          question_start_ms: qStartMs,
          question_duration_sec: durSec,
          correct_answer_index: typeof q.correctIndex === 'number' ? q.correctIndex : 0
        };
      }

      cumulativeMs += durMs + REVEAL_DURATION_MS;
    }

    return {
      status: 'finished',
      current_question_index: sortedQuestions.length,
      question_start_ms: startMs + cumulativeMs,
      question_duration_sec: 20,
      correct_answer_index: null,
      ended_at: new Date(startMs + cumulativeMs).toISOString()
    };
  }

  /**
   * Retrieves active session by ID, reconciling with authoritative timeline
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
      let sessionObj: LiveQuizSession = {
        ...data,
        quiz
      };

      // Compute authoritative state if scheduled or active
      const scheduledTime = sessionObj.scheduled_start_at || sessionObj.started_at;
      const scheduledMs = scheduledTime ? new Date(scheduledTime).getTime() : 0;
      const now = Date.now();

      if (
        scheduledMs > 0 &&
        now >= scheduledMs &&
        (sessionObj.status === 'scheduled' ||
          sessionObj.status === 'lobby' ||
          sessionObj.status === 'in_progress' ||
          sessionObj.status === 'reveal')
      ) {
        const computed = this.computeSessionTimeline(sessionObj, quiz?.questions || [], now);
        const hasDiverged =
          computed.status !== sessionObj.status ||
          computed.current_question_index !== sessionObj.current_question_index;

        sessionObj = {
          ...sessionObj,
          status: computed.status,
          current_question_index: computed.current_question_index,
          question_start_ms: computed.question_start_ms,
          question_duration_sec: computed.question_duration_sec,
          correct_answer_index: computed.correct_answer_index
        };

        // Asynchronously update divergence to database
        if (hasDiverged) {
          const updatePayload: any = {
            status: computed.status,
            current_question_index: computed.current_question_index,
            question_start_ms: computed.question_start_ms,
            question_duration_sec: computed.question_duration_sec,
            correct_answer_index: computed.correct_answer_index
          };
          if (computed.status === 'finished') {
            updatePayload.ended_at = computed.ended_at || new Date().toISOString();
          }
          Promise.resolve(
            supabase
              .from('live_quiz_sessions')
              .update(updatePayload)
              .eq('id', sessionId)
          ).catch(() => {});
        }
      }

      return sessionObj;
    } catch (err) {
      console.error('[LiveQuizService] getSessionById error:', err);
      return null;
    }
  }

  /**
   * Retrieves the currently active or scheduled Live Quiz session for a specific classroom (if any).
   * Used for direct PIN-free student joining and classroom dashboard state banner.
   */
  async getActiveSessionForClassroom(classroomId: string): Promise<LiveQuizSession | null> {
    if (!classroomId) return null;

    // 1. Authoritative Backend Check (bypasses RLS, cleans stale sessions server-side)
    try {
      const res = await fetch(`/api/classes/${classroomId}/live-quiz/active-session`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (!json.session || json.state === 'draft' || json.state === 'completed' || json.state === 'cancelled') {
            return null;
          }
          return json.session;
        }
      }
    } catch {
      // Backend offline or unreachable, proceed to Supabase fallback
    }

    if (!supabase) return null;

    // 2. Direct Supabase Query Fallback
    try {
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, subject),
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .eq('classroom_id', classroomId)
        .in('status', ['scheduled', 'lobby', 'in_progress', 'reveal'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // Staleness check: if created > 2 hours ago, auto-expire in DB and return null
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (ageMs > 2 * 60 * 60 * 1000) {
        supabase
          .from('live_quiz_sessions')
          .update({ status: 'finished', ended_at: new Date().toISOString() })
          .eq('id', data.id)
          .then();
        return null;
      }

      const effectiveState = this.getEffectiveSessionState(data);
      if (effectiveState === 'completed' || effectiveState === 'cancelled' || effectiveState === 'draft') {
        return null;
      }

      // If scheduled time has arrived, trigger auto-reconciliation
      // Note: scheduled sessions are stored with status = 'lobby' and started_at = future time
      const scheduledTime = data.scheduled_start_at || data.started_at;
      if (scheduledTime && new Date(scheduledTime).getTime() <= Date.now()
          && (data.status === 'scheduled' || data.status === 'lobby')) {
        const reconciled = await this.reconcileScheduledSession(data.id, classroomId);
        if (reconciled) return reconciled;
      }

      const quiz = data.quiz_id ? await this.getQuizById(data.quiz_id) : null;
      return {
        ...data,
        quiz
      };
    } catch (err) {
      console.error('[LiveQuizService] getActiveSessionForClassroom error:', err);
      return null;
    }
  }

  /**
   * Student joins a session and creates/updates participant record
   * Strictly prevents the host teacher from registering as a student participant.
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
      // 1. Authoritative Host Check: Host teacher must NEVER become a participant
      const { data: session } = await supabase
        .from('live_quiz_sessions')
        .select('teacher_id')
        .eq('id', payload.session_id)
        .maybeSingle();

      if (session?.teacher_id && session.teacher_id === userId) {
        return { error: 'Host teacher cannot join as a student participant.' };
      }

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
   * Retrieves participants in a session (strictly excludes the host teacher)
   */
  async getParticipants(sessionId: string): Promise<LiveQuizParticipant[]> {
    if (!supabase || !sessionId) return [];

    try {
      const { data: session } = await supabase
        .from('live_quiz_sessions')
        .select('teacher_id')
        .eq('id', sessionId)
        .maybeSingle();

      let query = supabase
        .from('live_quiz_participants')
        .select('*')
        .eq('session_id', sessionId);

      if (session?.teacher_id) {
        query = query.neq('student_id', session.teacher_id);
      }

      const { data, error } = await query.order('score', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[LiveQuizService] getParticipants notice:', err);
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
      // 0. Strict Host Check: Host teacher cannot submit student answers
      const { data: session } = await supabase
        .from('live_quiz_sessions')
        .select('teacher_id')
        .eq('id', payload.session_id)
        .maybeSingle();

      if (session?.teacher_id && session.teacher_id === userId) {
        return { error: 'Host teacher cannot submit student answers' };
      }

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
        // Fetch full results with student profiles for presentation (strictly excluding host teacher)
        const { data: sessionRow } = await supabase
          .from('live_quiz_sessions')
          .select('teacher_id')
          .eq('id', sessionId)
          .maybeSingle();

        let query = supabase
          .from('live_quiz_results')
          .select(`
            *,
            student:profiles!student_id (id, full_name, avatar_url, email)
          `)
          .eq('session_id', sessionId);

        if (sessionRow?.teacher_id) {
          query = query.neq('student_id', sessionRow.teacher_id);
        }

        const { data: fullResults } = await query.order('final_rank', { ascending: true });

        // Clean up any historical host records from DB if they exist
        if (sessionRow?.teacher_id) {
          supabase.from('live_quiz_results').delete().eq('session_id', sessionId).eq('student_id', sessionRow.teacher_id).then();
          supabase.from('live_quiz_participants').delete().eq('session_id', sessionId).eq('student_id', sessionRow.teacher_id).then();
        }

        return { data: fullResults || [] };
      }

      // 2. Direct fallback
      const session = await this.getSessionById(sessionId);
      if (!session) return { error: 'Session not found' };

      const totalQuestions = session.quiz?.questions.length || 1;

      let partsQuery = supabase
        .from('live_quiz_participants')
        .select('*')
        .eq('session_id', sessionId);
      let ansQuery = supabase
        .from('live_quiz_answers')
        .select('*')
        .eq('session_id', sessionId);

      if (session.teacher_id) {
        partsQuery = partsQuery.neq('student_id', session.teacher_id);
        ansQuery = ansQuery.neq('student_id', session.teacher_id);
      }

      const [participantsRes, answersRes] = await Promise.all([
        partsQuery.order('score', { ascending: false }),
        ansQuery
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

      if (session.classroom_id) {
        try {
          await fetch(`/api/classes/${session.classroom_id}/live-quiz/sessions/${sessionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch {}
      }

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
    const cleanPin = pin.trim();
    return supabase.channel(`live_quiz:${cleanPin}`, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: cleanPin }
      }
    });
  }

  /**
   * Checks if a student has already submitted an answer for a specific question in a session
   */
  async checkStudentExistingAnswer(
    sessionId: string,
    questionIndex: number,
    studentId: string
  ): Promise<{ answered: boolean; selectedOptionIndex?: number; pointsAwarded?: number }> {
    if (!supabase || !sessionId || !studentId) return { answered: false };

    try {
      const { data, error } = await supabase
        .from('live_quiz_answers')
        .select('selected_option_index, points_awarded')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error || !data) return { answered: false };

      return {
        answered: true,
        selectedOptionIndex: data.selected_option_index,
        pointsAwarded: data.points_awarded
      };
    } catch {
      return { answered: false };
    }
  }

  /**
   * Retrieves final results for a completed live quiz session (strictly excluding host teacher)
   */
  async getResults(sessionId: string): Promise<{ data?: LiveQuizResult[]; error?: string }> {
    if (!supabase || !sessionId) return { data: [] };
    try {
      const { data: session } = await supabase
        .from('live_quiz_sessions')
        .select('teacher_id')
        .eq('id', sessionId)
        .maybeSingle();

      let query = supabase
        .from('live_quiz_results')
        .select(`
          *,
          student:profiles!student_id (id, full_name, avatar_url, email)
        `)
        .eq('session_id', sessionId);

      if (session?.teacher_id) {
        query = query.neq('student_id', session.teacher_id);
      }

      const { data, error } = await query.order('final_rank', { ascending: true });

      if (error) throw error;
      return { data: data || [] };
    } catch (err: any) {
      return { error: err.message, data: [] };
    }
  }
}

export const liveQuizService = new LiveQuizService();
