// ============================================================================
// EDTECHRA-BITZ: Live Quiz Service (Supabase Realtime & Server-Authoritative)
// ============================================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/apiAuth';
import {
  LiveQuiz,
  LiveQuizSession,
  LiveQuizServerState,
  LiveQuizParticipant,
  LiveQuizResult,
  LiveQuizQuestion,
  LiveQuizStudentQuestion,
  EffectiveLiveQuizState
} from '@/types/liveQuiz';
import { READY_MADE_QUIZZES } from '@/data/readyMadeQuizzes';
import { extractCoverFromDescription, extractTrackQuizFromDescription, cleanDescription, encodeDescriptionWithCover } from '@/utils/quizCover';

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
          const nonArchived = data.filter((q: any) => q.is_archived !== true);
          const parsed = nonArchived.map((q: any) => {
            const isOwner = Boolean(currentUserId && q.created_by === currentUserId);
            const creatorName = isOwner
              ? 'Created by You'
              : q.teacher?.full_name
              ? `Created by ${q.teacher.full_name}`
              : q.created_by
              ? 'Created by Teacher'
              : 'Created by EdTechra';

            const embeddedCover = extractCoverFromDescription(q.description);
            const finalCover = q.cover_image || q.cover_image_url || embeddedCover || null;
            const trackQuiz = q.track_quiz === false ? false : extractTrackQuizFromDescription(q.description);

            return {
              ...q,
              description: cleanDescription(q.description),
              cover_image: finalCover,
              cover_image_url: finalCover,
              visibility: q.visibility || 'private',
              timer_enabled: q.timer_enabled ?? true,
              timer_seconds: q.timer_seconds ?? (q.questions?.[0]?.duration_sec || 20),
              track_quiz: trackQuiz,
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
      timer_enabled: true,
      timer_seconds: q.questions?.[0]?.durationSec || 20,
      track_quiz: true,
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
        timer_enabled: true,
        timer_seconds: readyMade.questions?.[0]?.durationSec || 20,
        track_quiz: true,
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

      if (error || !data || data.is_archived === true) {
        // Fallback 1: Query server endpoint for public metadata (bypasses RLS safely without answers)
        try {
          const apiRes = await fetch(`/api/live-quiz/quiz-info/${quizId}`);
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.success && json.data) {
              const qData = json.data;
              let studentQuestions: any[] = [];
              try {
                const { data: qRows } = await supabase.rpc('get_live_quiz_questions_for_student', { p_quiz_id: quizId });
                if (Array.isArray(qRows)) {
                  studentQuestions = qRows.map((item: any) => ({
                    id: item.id,
                    question: item.question_text,
                    options: item.options,
                    durationSec: item.duration_sec || 20
                  }));
                }
              } catch {}

              const embeddedFallbackCover = extractCoverFromDescription(qData.description);
              const finalFallbackCover = qData.cover_image || qData.cover_image_url || embeddedFallbackCover || null;
              const fallbackTrackQuiz = qData.track_quiz === false ? false : extractTrackQuizFromDescription(qData.description);

              return {
                ...qData,
                description: cleanDescription(qData.description),
                cover_image: finalFallbackCover,
                cover_image_url: finalFallbackCover,
                visibility: 'private',
                timer_enabled: qData.timer_enabled ?? true,
                timer_seconds: qData.timer_seconds ?? (studentQuestions[0]?.durationSec || 20),
                track_quiz: fallbackTrackQuiz,
                is_owner: false,
                creator_name: 'Created by Teacher',
                questions: studentQuestions
              };
            }
          }
        } catch {}

        // Fallback 2: Check R2 mirror
        try {
          const r2Res = await fetch(`/api/live-quiz/get-r2/${quizId}`);
          if (r2Res.ok) {
            const r2Json = await r2Res.json();
            if (r2Json.success && r2Json.data) {
              const r2EmbeddedCover = extractCoverFromDescription(r2Json.data.description);
              const r2FinalCover = r2Json.data.cover_image || r2Json.data.cover_image_url || r2EmbeddedCover || null;
              const r2TrackQuiz = r2Json.data.track_quiz === false ? false : extractTrackQuizFromDescription(r2Json.data.description);
              return {
                ...r2Json.data,
                description: cleanDescription(r2Json.data.description),
                cover_image: r2FinalCover,
                cover_image_url: r2FinalCover,
                track_quiz: r2TrackQuiz
              };
            }
          }
        } catch {}

        return null;
      }

      const isOwner = Boolean(currentUserId && data.created_by === currentUserId);
      const creatorName = isOwner
        ? 'Created by You'
        : data.teacher?.full_name
        ? `Created by ${data.teacher.full_name}`
        : data.created_by
        ? 'Created by Teacher'
        : 'Created by EdTechra';

      const defaultPtsPerQ = Math.max(1, Math.round(100 / Math.max(1, (data.questions || []).length)));
      let questionsList = (data.questions || []).sort((a: any, b: any) => a.question_index - b.question_index).map((item: any) => ({
        id: item.id,
        question: item.question_text,
        options: item.options,
        correctIndex: item.correct_index,
        durationSec: item.duration_sec,
        explanation: item.explanation,
        hint: item.hint || '',
        questionType: item.question_type || 'multiple_choice',
        points: item.points && item.points < 500 ? item.points : defaultPtsPerQ
      }));

      // RLS Fallback for students: if direct query returned no questions, fetch via security definer RPC
      if (questionsList.length === 0) {
        try {
          const { data: studentQuestions, error: rpcErr } = await supabase.rpc('get_live_quiz_questions_for_student', {
            p_quiz_id: quizId
          });
          if (!rpcErr && Array.isArray(studentQuestions) && studentQuestions.length > 0) {
            const stuDefaultPts = Math.max(1, Math.round(100 / Math.max(1, studentQuestions.length)));
            questionsList = studentQuestions.sort((a: any, b: any) => (a.question_index ?? 0) - (b.question_index ?? 0)).map((item: any) => ({
              id: item.id,
              question: item.question_text,
              options: item.options,
              correctIndex: -1, // hidden from students
              durationSec: item.duration_sec || 20,
              explanation: '',
              hint: item.hint || '',
              questionType: item.question_type || 'multiple_choice',
              points: item.points && item.points < 500 ? item.points : stuDefaultPts
            }));
          }
        } catch (rpcEx) {
          console.warn('[LiveQuizService] Student RPC questions fallback notice:', rpcEx);
        }
      }

      const embeddedCover = extractCoverFromDescription(data.description);
      const finalCover = data.cover_image || data.cover_image_url || embeddedCover || null;
      const trackQuiz = data.track_quiz === false ? false : extractTrackQuizFromDescription(data.description);

      return {
        ...data,
        description: cleanDescription(data.description),
        cover_image: finalCover,
        cover_image_url: finalCover,
        visibility: data.visibility || 'private',
        timer_enabled: data.timer_enabled ?? true,
        timer_seconds: data.timer_seconds ?? (questionsList[0]?.durationSec || 20),
        track_quiz: trackQuiz,
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
        const defaultPtsPerQ = Math.max(1, Math.round(100 / Math.max(1, data.length)));
        return data.sort((a: any, b: any) => (a.question_index ?? 0) - (b.question_index ?? 0)).map((item: any) => ({
          id: item.id,
          question: item.question_text,
          options: item.options,
          durationSec: item.duration_sec || 20,
          hint: item.hint || '',
          questionType: item.question_type || 'multiple_choice',
          points: item.points && item.points < 500 ? item.points : defaultPtsPerQ
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
   * Direct AI Quiz Builder: Generates a full structured quiz + AI cover image on the server
   */
  async generateAiQuiz(params: {
    title?: string;
    category: string;
    topic: string;
    content?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    questionCount: number;
    timePerQuestion: number;
    pointsPerQuestion?: number;
    studentLevel?: string;
    learningObjectives?: string;
    provider?: 'auto' | 'openai' | 'gemini';
    generateCover?: boolean;
  }): Promise<{
    data?: {
      title: string;
      description: string;
      category: string;
      topic: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      timePerQuestion: number;
      pointsPerQuestion: number;
      coverImageUrl?: string | null;
      questions: LiveQuizQuestion[];
      provider?: string;
      validationReport?: {
        passed: boolean;
        totalQuestions: number;
        topicRelevance: string;
        duplicateQuestions: number;
        validAnswerOptions: string;
        correctAnswersIdentified: string;
        difficultyCompliance: string;
        regeneratedCount?: number;
      };
    };
    error?: string;
  }> {
    try {
      const res = await authenticatedFetch('/api/live-quiz/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.quiz) {
        return { error: json.error || `Failed to generate quiz (${res.status})` };
      }
      return {
        data: {
          ...json.quiz,
          provider: json.provider,
          validationReport: json.validationReport || json.quiz.validationReport
        }
      };
    } catch (err: any) {
      return { error: err.message || 'Network error while generating AI quiz' };
    }
  }

  /**
   * Direct AI Quiz Builder: Regenerates a single question in the editable preview
   */
  async regenerateAiQuestion(params: {
    topic: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    studentLevel?: string;
    currentQuestion?: string;
    questionIndex: number;
    existingQuestions?: string[];
    timePerQuestion?: number;
    pointsPerQuestion?: number;
    provider?: 'auto' | 'openai' | 'gemini';
  }): Promise<{ data?: LiveQuizQuestion; error?: string }> {
    try {
      const res = await authenticatedFetch('/api/live-quiz/ai-regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.question) {
        return { error: json.error || 'Failed to regenerate question' };
      }
      return { data: json.question };
    } catch (err: any) {
      return { error: err.message || 'Network error regenerating question' };
    }
  }

  /**
   * Direct AI Quiz Builder: Generates or regenerates a 16:9 quiz cover image and stores it in Supabase Storage
   */
  async generateAiCoverImage(params: {
    title?: string;
    topic: string;
    category: string;
    difficulty?: string;
  }): Promise<{ coverImageUrl?: string; error?: string }> {
    try {
      const res = await authenticatedFetch('/api/live-quiz/ai-generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.coverImageUrl) {
        return { error: json.error || `Failed to generate cover image (${res.status})` };
      }
      return { coverImageUrl: json.coverImageUrl };
    } catch (err: any) {
      return { error: err.message || 'Network error generating cover image' };
    }
  }

  /**
   * Uploads a custom quiz cover image into Supabase Storage ('quiz-covers' bucket)
   * and returns the public Supabase Storage URL.
   */
  async uploadQuizCoverImage(file: File): Promise<{ publicUrl?: string; error?: string }> {
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected cover image file.'));
        reader.readAsDataURL(file);
      });

      const res = await authenticatedFetch('/api/live-quiz/upload-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          contentType: file.type || 'image/png',
          filename: file.name || 'custom-cover.png'
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.publicUrl) {
        return { error: json.error || `Failed to upload cover image (${res.status})` };
      }
      return { publicUrl: json.publicUrl };
    } catch (err: any) {
      return { error: err.message || 'Network error uploading cover image' };
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
    topic?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    accent_color?: string;
    cover_image?: string | null;
    cover_image_url?: string | null;
    questions: LiveQuizQuestion[];
    is_public?: boolean;
    visibility?: 'private' | 'common';
    timer_enabled?: boolean;
    timer_seconds?: number | null;
    points_per_question?: number;
    track_quiz?: boolean;
  }): Promise<{ data?: LiveQuiz; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();

    // Per-Question Timer Validation
    const timerEnabled = payload.timer_enabled !== false;
    let timerSeconds: number | null = null;
    if (timerEnabled) {
      const parsedSec = Number(payload.timer_seconds ?? payload.questions?.[0]?.durationSec ?? 20);
      if (isNaN(parsedSec) || parsedSec <= 0 || !Number.isInteger(parsedSec)) {
        timerSeconds = 20; // Default 20s per question
      } else {
        timerSeconds = Math.min(3600, Math.max(5, Math.floor(parsedSec)));
      }
    }

    const perQuestionDurationSec = timerEnabled && timerSeconds ? timerSeconds : 86400;
    const trackQuiz = payload.track_quiz !== false;

    // Strictly default to 'private' unless explicitly declared 'common'
    const visibility = payload.visibility === 'common' ? 'common' : 'private';
    const coverImage = (payload.cover_image || payload.cover_image_url || '').trim() || null;
    const encodedDescription = encodeDescriptionWithCover(payload.description, coverImage, trackQuiz);

    // Title Duplicate Protection: Normalize title (trim, collapse spaces, lowercase)
    const normalizedNewTitle = payload.title.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalizedNewTitle) {
      return { error: 'Please provide a valid quiz title.' };
    }

    if (userId) {
      try {
        const { data: userQuizzes, error: checkErr } = await supabase
          .from('live_quizzes')
          .select('id, title, is_archived')
          .eq('created_by', userId);

        if (!checkErr && userQuizzes) {
          const isDuplicate = userQuizzes
            .filter((q) => !q.is_archived)
            .some((q) => {
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

    // Question Count Validation (allow 1..50 questions so teachers can freely add or delete questions in preview/manual editor)
    if (!Array.isArray(payload.questions) || payload.questions.length < 1 || payload.questions.length > 50) {
      return { error: 'Quizzes must contain between 1 and 50 questions.' };
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
        if (/^(all|none)\s+of\s+the\s+above$/i.test(optText)) {
          return {
            error: `Question ${qNum}, choice "${optText}" is forbidden. Never use "All of the above" or "None of the above".`
          };
        }
      }
    }

    const normalizedQuestions = payload.questions.map((q) => ({
      ...q,
      durationSec: perQuestionDurationSec
    }));

    try {
      // 1. Insert quiz header (with fallback if cover_image or track_quiz column not yet migrated)
      const baseInsertPayload = {
        classroom_id: payload.classroom_id || null,
        title: payload.title.trim(),
        description: encodedDescription,
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

      // Attempt 1: with track_quiz, cover_image, and cover_image_url (if provided)
      const attempt1Payload: any = {
        ...baseInsertPayload,
        track_quiz: trackQuiz,
        ...(coverImage ? { cover_image: coverImage, cover_image_url: coverImage } : {})
      };
      const attempt1 = await supabase
        .from('live_quizzes')
        .insert(attempt1Payload)
        .select()
        .single();
      quizData = attempt1.data;
      quizError = attempt1.error;

      // Attempt 2: retry with cover_image only if cover_image_url column doesn't exist
      if (!quizData && quizError && coverImage) {
        const { data: fbData1, error: fbErr1 } = await supabase
          .from('live_quizzes')
          .insert({
            ...baseInsertPayload,
            track_quiz: trackQuiz,
            cover_image: coverImage
          })
          .select()
          .single();
        quizData = fbData1;
        quizError = fbErr1;
      }

      // Attempt 2: fallback without cover_image / track_quiz if schema hasn't been migrated yet
      if (!quizData && quizError) {
        const fallbackAttempt = await supabase
          .from('live_quizzes')
          .insert(baseInsertPayload)
          .select()
          .single();
        quizData = fallbackAttempt.data;
        quizError = fallbackAttempt.error;
      }

      if (quizError) throw quizError;

      // 2. Insert normalized questions with per-question duration (100 base points across the quiz)
      const perQuestionPoints = Math.max(1, Math.round(100 / Math.max(1, normalizedQuestions.length)));
      const extendedQuestionRows = normalizedQuestions.map((q, idx) => ({
        quiz_id: quizData.id,
        question_index: idx,
        question_text: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        duration_sec: perQuestionDurationSec,
        explanation: q.explanation || null,
        hint: q.hint || '',
        question_type: q.questionType || 'multiple_choice',
        points: perQuestionPoints
      }));

      let { error: questionsError } = await supabase
        .from('live_quiz_questions')
        .insert(extendedQuestionRows);

      if (questionsError) {
        const legacyQuestionRows = normalizedQuestions.map((q, idx) => ({
          quiz_id: quizData.id,
          question_index: idx,
          question_text: q.question,
          options: q.options,
          correct_index: q.correctIndex,
          duration_sec: perQuestionDurationSec,
          explanation: q.explanation || null
        }));
        const retryQ = await supabase.from('live_quiz_questions').insert(legacyQuestionRows);
        questionsError = retryQ.error;
      }

      if (questionsError) {
        console.warn('live_quiz_questions batch insert error:', questionsError.message);
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
              track_quiz: trackQuiz,
              questions: normalizedQuestions,
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
          description: cleanDescription(payload.description),
          cover_image: coverImage || quizData.cover_image || null,
          cover_image_url: coverImage || quizData.cover_image || null,
          visibility,
          timer_enabled: timerEnabled,
          timer_seconds: timerSeconds,
          track_quiz: trackQuiz,
          is_owner: true,
          creator_name: 'Created by You',
          questions: normalizedQuestions
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
      timer_enabled: original.timer_enabled ?? true,
      timer_seconds: original.timer_seconds ?? (original.questions?.[0]?.durationSec || 20),
      track_quiz: original.track_quiz !== false,
      visibility: 'private',
      is_public: false
    });
  }

  /**
   * Updates an existing custom quiz (metadata & questions), preserving its ID and ownership
   */
  async updateCustomQuiz(
    quizId: string,
    payload: {
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
      track_quiz?: boolean;
    }
  ): Promise<{ data?: LiveQuiz; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    // 1. Verify existence and ownership
    const { data: existingQuiz, error: fetchErr } = await supabase
      .from('live_quizzes')
      .select('id, created_by, is_archived')
      .eq('id', quizId)
      .maybeSingle();

    if (fetchErr || !existingQuiz) {
      return { error: 'Quiz not found' };
    }

    if (existingQuiz.created_by !== userId) {
      return { error: 'You do not have permission to edit this quiz' };
    }

    // 2. Validate Question Count (allow 1..50 questions)
    if (!Array.isArray(payload.questions) || payload.questions.length < 1 || payload.questions.length > 50) {
      return { error: 'Quizzes must contain between 1 and 50 questions.' };
    }

    // 3. Validate Options (exactly 4 non-empty options, no all/none)
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
        return { error: `Question ${qNum} must have exactly 4 choices.` };
      }

      for (let j = 0; j < opts.length; j++) {
        const optText = (opts[j] || '').trim();
        const words = optText.split(/\s+/).filter(Boolean);
        if (words.length < 1) {
          return { error: `Question ${qNum}, choice ${j + 1} cannot be empty.` };
        }
        if (/^(all|none)\s+of\s+the\s+above$/i.test(optText)) {
          return {
            error: `Question ${qNum}, choice "${optText}" is forbidden. Never use "All of the above" or "None of the above".`
          };
        }
      }
    }

    // 4. Duplicate title check (excluding current quizId)
    const normalizedNewTitle = payload.title.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!normalizedNewTitle) {
      return { error: 'Please provide a valid quiz title.' };
    }

    const { data: userQuizzes } = await supabase
      .from('live_quizzes')
      .select('id, title, is_archived')
      .eq('created_by', userId)
      .neq('id', quizId);

    if (userQuizzes) {
      const isDuplicate = userQuizzes
        .filter((q) => !q.is_archived)
        .some((q) => {
          const existingNorm = (q.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
          return existingNorm === normalizedNewTitle;
        });
      if (isDuplicate) {
        return { error: 'A quiz with this title already exists. Please choose a different title.' };
      }
    }

    // 5. Per-Question Timer, tracking, and visibility
    const timerEnabled = payload.timer_enabled !== false;
    let timerSeconds: number | null = null;
    if (timerEnabled) {
      const parsedSec = Number(payload.timer_seconds ?? payload.questions?.[0]?.durationSec ?? 20);
      if (isNaN(parsedSec) || parsedSec <= 0 || !Number.isInteger(parsedSec)) {
        timerSeconds = 20;
      } else {
        timerSeconds = Math.min(3600, Math.max(5, Math.floor(parsedSec)));
      }
    }

    const perQuestionDurationSec = timerEnabled && timerSeconds ? timerSeconds : 86400;
    const trackQuiz = payload.track_quiz !== false;

    const visibility = payload.visibility === 'common' ? 'common' : 'private';
    const coverImage = (payload.cover_image || payload.cover_image_url || '').trim() || null;
    const encodedDescription = encodeDescriptionWithCover(payload.description, coverImage, trackQuiz);

    const normalizedQuestions = payload.questions.map((q) => ({
      ...q,
      durationSec: perQuestionDurationSec
    }));

    try {
      // 6. Update quiz header
      const updateHeaderPayload: any = {
        title: payload.title.trim(),
        description: encodedDescription,
        category: payload.category || 'General',
        difficulty: payload.difficulty || 'Medium',
        accent_color: payload.accent_color || '#026fc3',
        is_public: visibility === 'common',
        visibility,
        timer_enabled: timerEnabled,
        timer_seconds: timerSeconds,
        track_quiz: trackQuiz,
        cover_image: coverImage,
        cover_image_url: coverImage,
        updated_at: new Date().toISOString()
      };

      if (payload.classroom_id !== undefined) {
        updateHeaderPayload.classroom_id = payload.classroom_id || null;
      }

      let updatedHeader: any = null;
      const { data: uData, error: updateErr } = await supabase
        .from('live_quizzes')
        .update(updateHeaderPayload)
        .eq('id', quizId)
        .select()
        .single();

      if (updateErr) {
        // Fallback: cover_image, cover_image_url, or track_quiz column may not exist in older live_quizzes schema
        delete updateHeaderPayload.cover_image_url;
        delete updateHeaderPayload.cover_image;
        delete updateHeaderPayload.track_quiz;
        const { data: fbData, error: fbErr } = await supabase
          .from('live_quizzes')
          .update(updateHeaderPayload)
          .eq('id', quizId)
          .select()
          .single();
        if (fbErr) throw fbErr;
        updatedHeader = fbData;
      } else {
        updatedHeader = uData;
      }

      // 7. Replace questions: delete old, insert new
      await supabase.from('live_quiz_questions').delete().eq('quiz_id', quizId);

      const questionRows = normalizedQuestions.map((q, idx) => ({
        quiz_id: quizId,
        question_index: idx,
        question_text: q.question,
        options: q.options,
        correct_index: q.correctIndex ?? 0,
        duration_sec: perQuestionDurationSec,
        explanation: q.explanation || null
      }));

      const { error: questionsError } = await supabase
        .from('live_quiz_questions')
        .insert(questionRows);

      if (questionsError) {
        console.warn('live_quiz_questions batch update error:', questionsError.message);
      }

      // 8. Mirror to R2
      try {
        await fetch('/api/live-quiz/save-r2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId,
            quizData: {
              ...updatedHeader,
              visibility,
              timer_enabled: timerEnabled,
              timer_seconds: timerSeconds,
              track_quiz: trackQuiz,
              questions: normalizedQuestions,
              storage_provider: 'cloudflare_r2'
            }
          })
        });
      } catch (r2Err) {
        console.warn('[LiveQuizService] R2 mirror update notice:', r2Err);
      }

      return {
        data: {
          ...updatedHeader,
          description: cleanDescription(payload.description),
          cover_image: coverImage,
          cover_image_url: coverImage,
          visibility,
          timer_enabled: timerEnabled,
          timer_seconds: timerSeconds,
          track_quiz: trackQuiz,
          is_owner: true,
          creator_name: 'Created by You',
          questions: normalizedQuestions
        }
      };
    } catch (err: any) {
      console.error('[LiveQuizService] updateCustomQuiz error:', err);
      if (
        err?.code === '23505' ||
        err?.message?.includes('duplicate key') ||
        err?.message?.includes('idx_live_quizzes_owner_norm_title') ||
        err?.message?.includes('already exists')
      ) {
        return { error: 'A quiz with this title already exists. Please choose a different title.' };
      }
      return { error: err.message || 'Failed to update quiz' };
    }
  }

  /**
   * Safely deletes a custom quiz by archiving it, preserving historical session analytics
   */
  async deleteCustomQuiz(quizId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { success: false, error: 'Authentication required' };

    try {
      // Verify ownership
      const { data: quiz, error: fetchErr } = await supabase
        .from('live_quizzes')
        .select('id, created_by')
        .eq('id', quizId)
        .maybeSingle();

      if (fetchErr || !quiz) {
        return { success: false, error: 'Quiz not found' };
      }

      if (quiz.created_by !== userId) {
        return { success: false, error: 'You do not have permission to delete this quiz' };
      }

      // Soft delete: mark is_archived = true
      const { error: archiveErr } = await supabase
        .from('live_quizzes')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', quizId)
        .eq('created_by', userId);

      if (archiveErr) {
        console.warn('[LiveQuizService] Soft-delete error, attempting fallback hard delete:', archiveErr);
        const { error: hardDeleteErr } = await supabase
          .from('live_quizzes')
          .delete()
          .eq('id', quizId)
          .eq('created_by', userId);
        if (hardDeleteErr) throw hardDeleteErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error('[LiveQuizService] deleteCustomQuiz error:', err);
      return { success: false, error: err.message || 'Failed to delete quiz' };
    }
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
          cover_image: payload.custom_quiz.cover_image || payload.custom_quiz.cover_image_url || null,
          cover_image_url: payload.custom_quiz.cover_image_url || payload.custom_quiz.cover_image || null,
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
            cover_image: readyMade.cover_image || readyMade.cover_image_url || null,
            cover_image_url: readyMade.cover_image_url || readyMade.cover_image || null,
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
      if (quiz && payload.custom_quiz) {
        if (!quiz.cover_image && !quiz.cover_image_url) {
          quiz.cover_image = payload.custom_quiz.cover_image || payload.custom_quiz.cover_image_url || null;
          quiz.cover_image_url = payload.custom_quiz.cover_image_url || payload.custom_quiz.cover_image || null;
        }
      }
      const isTimerEnabled = quiz?.timer_enabled !== false;
      const firstQDuration = isTimerEnabled
        ? (quiz?.timer_seconds || quiz?.questions?.[0]?.durationSec || 20)
        : 86400;
      const totalTimerEnabled = isTimerEnabled;
      const totalQuestionsCount = Math.max(1, quiz?.questions?.length || 5);
      const minSafeSec = totalQuestionsCount * (firstQDuration + 15) + 120;
      const totalTimerSeconds = totalTimerEnabled ? minSafeSec : null;
      const isScheduled = Boolean(payload.is_scheduled && payload.scheduled_start_at);
      const scheduledStartAt = isScheduled ? payload.scheduled_start_at! : null;
      // For Launch Now: started_at MUST be null until teacher clicks Start Quiz
      // For Scheduled: started_at stores the future scheduled start time
      const startedAt = isScheduled && scheduledStartAt ? new Date(scheduledStartAt).toISOString() : null;
      // IMPORTANT: expires_at must ONLY be set for scheduled sessions during creation.
      // For instant sessions, expires_at is calculated fresh in startSession when the quiz actually begins,
      // preventing lobby waiting time from prematurely expiring the quiz!
      const expiresAt = totalTimerEnabled && totalTimerSeconds && isScheduled && scheduledStartAt
        ? new Date(new Date(scheduledStartAt).getTime() + totalTimerSeconds * 1000).toISOString()
        : null;

      // Generate unique PIN
      const pin = this.generatePin();

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
    let calculatedExpiresAt: string | null = null;
    try {
      const existingSession = await this.getSessionById(sessionId);
      const isTimed = existingSession?.quiz?.timer_enabled !== false;
      if (!isTimed) {
        initialDurationSec = 86400;
      } else if (existingSession?.quiz?.timer_seconds) {
        initialDurationSec = existingSession.quiz.timer_seconds;
      } else if (existingSession?.quiz?.questions?.[0]?.durationSec) {
        initialDurationSec = existingSession.quiz.questions[0].durationSec;
      }
      if (isTimed) {
        const totalQuestions = Math.max(1, existingSession?.quiz?.questions?.length || 5);
        const minSafeSec = totalQuestions * (initialDurationSec + 15) + 120;
        calculatedExpiresAt = new Date(startMs + minSafeSec * 1000).toISOString();
      }
    } catch {}

    // 1. Direct Supabase update (Immediate for teacher / session owner)
    if (supabase) {
      try {
        const updatePayload: any = {
          status: 'in_progress',
          started_at: new Date(startMs).toISOString(),
          current_question_index: 0,
          question_start_ms: startMs,
          question_duration_sec: initialDurationSec,
          correct_answer_index: null
        };
        if (calculatedExpiresAt) {
          updatePayload.expires_at = calculatedExpiresAt;
        }

        const { data, error } = await supabase
          .from('live_quiz_sessions')
          .update(updatePayload)
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
      const cleanClassroomId = classroomId && classroomId !== 'undefined' && classroomId !== 'null' ? classroomId : 'all';
      const response = await authenticatedFetch(`/api/classes/${cleanClassroomId}/live-quiz/sessions/${sessionId}/reconcile-scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const cleanClassroomId = classroomId && classroomId !== 'undefined' && classroomId !== 'null' ? classroomId : 'all';
      // First try backend authoritative reconciliation endpoint with Bearer auth token
      const response = await authenticatedFetch(`/api/classes/${cleanClassroomId}/live-quiz/sessions/${sessionId}/reconcile-scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
      const existing = await this.getSessionById(sessionId);
      const isTimed = existing?.quiz?.timer_enabled !== false;
      const q0Dur = isTimed
        ? (existing?.quiz?.timer_seconds || existing?.quiz?.questions?.[0]?.durationSec || existing?.question_duration_sec || 20)
        : 86400;
      let recExpiresAt: string | null = null;
      if (isTimed) {
        const totalQuestions = Math.max(1, existing?.quiz?.questions?.length || 5);
        const minSafeSec = totalQuestions * (q0Dur + 15) + 120;
        recExpiresAt = new Date(startMs + minSafeSec * 1000).toISOString();
      }

      const recUpdatePayload: any = {
        status: 'in_progress',
        started_at: new Date(startMs).toISOString(),
        current_question_index: 0,
        question_start_ms: startMs,
        question_duration_sec: q0Dur,
        correct_answer_index: null
      };
      if (recExpiresAt) {
        recUpdatePayload.expires_at = recExpiresAt;
      }

      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .update(recUpdatePayload)
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
        (sessionObj.status === 'scheduled' || sessionObj.status === 'lobby')
      ) {
        const q0Dur = quiz?.questions?.[0]?.durationSec || sessionObj.question_duration_sec || 20;
        sessionObj = {
          ...sessionObj,
          status: 'in_progress',
          current_question_index: 0,
          started_at: new Date(now).toISOString(),
          question_start_ms: sessionObj.question_start_ms || now,
          question_duration_sec: q0Dur,
          correct_answer_index: null
        };
      } else if (sessionObj.status === 'in_progress' || sessionObj.status === 'reveal') {
        // Authoritative server snapshot (server clock + lazy expiry). READ-ONLY for the client:
        // the previous started_at timeline recompute + fire-and-forget write-back reverted
        // early advances and fought with the RPC. It has been removed.
        const state = await this.getLiveState(sessionId);
        if (state) {
          sessionObj = {
            ...sessionObj,
            status: state.status as any,
            current_question_index: state.current_question_index,
            question_start_ms: state.question_start_ms,
            question_duration_sec: state.question_duration_sec,
            correct_answer_index: state.correct_index ?? null
          };
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
   * DEPRECATED no-op. Question start/advance is owned by the server state machine
   * (`advance_live_quiz_question` / `submit_live_quiz_answer`). The previous version wrote the
   * TEACHER'S Date.now() into question_start_ms, causing clock-skew false TIME UPs and stale
   * overwrites of the RPC's advance.
   */
  async startQuestion(_payload: {
    session_id: string;
    question_index: number;
    duration_sec: number;
    correct_answer_index?: number;
  }): Promise<{ error?: string }> {
    return {};
  }


  /**
   * Student submits an answer to the active question.
   * Uses server-authoritative RPC `submit_live_quiz_answer` to evaluate correctness,
   * compute speed bonus (500 base + up to 500 speed bonus), prevent duplicates,
   * and increment score atomically.
   */
  async submitAnswer(payload: {
    session_id: string;
    question_index: number;
    selected_option_index: number;
    allow_change?: boolean;
  }): Promise<{
    data?: {
      is_correct: boolean;
      points_awarded: number;
      base_points?: number;
      speed_bonus?: number;
      response_time_ms?: number;
      current_score?: number;
      eligible_count?: number;
      answered_count?: number;
      all_answered?: boolean;
      advanced?: boolean;
      next_question_index?: number;
      is_finished?: boolean;
      duplicate?: boolean;
      changed?: boolean;
    };
    error?: string;
    code?:
      | 'LATE'
      | 'NOT_ACTIVE'
      | 'QUESTION_MISMATCH'
      | 'RPC_ERROR'
      | 'ENGINE_NOT_INSTALLED'
      | 'AUTH'
      | 'SESSION_EXPIRED'
      | 'NETWORK_ERROR'
      | 'ALREADY_SUBMITTED'
      | 'QUESTION_CLOSED';
    current_question_index?: number;
  }> {
    if (!supabase) {
      return { error: 'Database connection is not configured.', code: 'RPC_ERROR' };
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        error: 'Network unavailable. Your selected answer is preserved — it will submit when your connection returns.',
        code: 'NETWORK_ERROR'
      };
    }

    let userId = await this.getUserId();
    if (!userId) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        userId = refreshed?.session?.user?.id || null;
      } catch {
        // Ignore refresh error
      }
    }
    if (!userId) {
      return {
        error: 'Session expired. Please sign in again to submit your answer.',
        code: 'SESSION_EXPIRED'
      };
    }

    let rpcData: any = null;
    let rpcError: any = null;

    const executeRpcCall = async () => {
      let data: any = null;
      let error: any = null;

      if (payload.allow_change) {
        const attempt4 = await supabase!.rpc('submit_live_quiz_answer', {
          p_session_id: payload.session_id,
          p_question_index: payload.question_index,
          p_selected_option_index: payload.selected_option_index,
          p_allow_change: true
        });
        data = attempt4.data;
        error = attempt4.error;
      }

      if (!payload.allow_change || (error && /function|signature|parameter/i.test(error.message || ''))) {
        const attempt3 = await supabase!.rpc('submit_live_quiz_answer', {
          p_session_id: payload.session_id,
          p_question_index: payload.question_index,
          p_selected_option_index: payload.selected_option_index
        });
        data = attempt3.data;
        error = attempt3.error;
      }
      return { data, error };
    };

    // Execute with up to 2 automatic retries on transient network errors
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await executeRpcCall();
        rpcData = res.data;
        rpcError = res.error;

        if (!rpcError) break;

        const errMsg = String(rpcError.message || '');
        const isTransientNetwork =
          /failed to fetch|networkerror|load failed|network request failed|timeout|fetch/i.test(errMsg);
        const isAuthError =
          rpcError.code === 'PGRST301' || /jwt|unauthorized|not authenticated|token/i.test(errMsg);

        if (isAuthError && attempt === 0) {
          await supabase.auth.refreshSession().catch(() => {});
          continue;
        }

        if (isTransientNetwork && attempt < 2) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
        break;
      } catch (err: any) {
        rpcError = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
      }
    }

    if (rpcError) {
      const msg = String(rpcError.message || 'Database submission failed');
      console.error('[LiveQuizService] submit_live_quiz_answer RPC failure:', {
        code: rpcError.code,
        message: msg,
        details: rpcError.details,
        hint: rpcError.hint,
        sessionId: payload.session_id,
        questionIndex: payload.question_index
      });

      if (/failed to fetch|networkerror|load failed|network request failed|offline/i.test(msg)) {
        return {
          error: 'Network unavailable. Your selected option is still highlighted — tap Submit Answer to retry.',
          code: 'NETWORK_ERROR'
        };
      }
      if (rpcError.code === 'PGRST301' || /jwt|not authenticated|authentication|session expired/i.test(msg)) {
        return {
          error: 'Session expired. Please refresh the page or sign in again.',
          code: 'SESSION_EXPIRED'
        };
      }
      const missing = (rpcError as any).code === 'PGRST202' || /could not find the function/i.test(msg);
      return {
        error: missing
          ? 'Live quiz grading service is unavailable.'
          : 'Database submission failed. Your selection is saved on screen — please tap Submit Answer again.',
        code: missing ? 'ENGINE_NOT_INSTALLED' : 'RPC_ERROR'
      };
    }

    if (!rpcData) {
      return {
        error: 'Database submission failed (empty server response). Please tap Submit Answer again.',
        code: 'RPC_ERROR'
      };
    }

    if (rpcData.ok === false) {
      const rawCode = String(rpcData.code || 'REJECTED');
      console.warn('[LiveQuizService] submit_live_quiz_answer rejected by server rule:', {
        code: rawCode,
        status: rpcData.status,
        currentQuestionIndex: rpcData.current_question_index,
        requestedQuestionIndex: payload.question_index
      });

      if (rawCode === 'SESSION_EXPIRED' || rawCode === 'AUTH') {
        return {
          error: rpcData.message || 'Session expired. Please sign in again.',
          code: 'SESSION_EXPIRED'
        };
      }
      if (rawCode === 'LATE') {
        return {
          error: rpcData.message || 'Question already closed (time expired).',
          code: 'LATE',
          current_question_index:
            typeof rpcData.current_question_index === 'number' ? rpcData.current_question_index : undefined
        };
      }
      if (rawCode === 'QUESTION_MISMATCH') {
        return {
          error: rpcData.message || 'Question already closed. Syncing to the active question...',
          code: 'QUESTION_MISMATCH',
          current_question_index:
            typeof rpcData.current_question_index === 'number' ? rpcData.current_question_index : undefined
        };
      }
      if (rawCode === 'SESSION_NOT_ACTIVE' || rawCode === 'NOT_ACTIVE') {
        return {
          error: rpcData.message || 'Question already closed.',
          code: 'NOT_ACTIVE',
          current_question_index:
            typeof rpcData.current_question_index === 'number' ? rpcData.current_question_index : undefined
        };
      }
      return {
        error: rpcData.message || `Submission rejected (${rawCode}).`,
        code: 'RPC_ERROR',
        current_question_index:
          typeof rpcData.current_question_index === 'number' ? rpcData.current_question_index : undefined
      };
    }

    const isCorrect = Boolean(rpcData.is_correct);
    const pointsAwarded = Number(rpcData.points_awarded || 0);
    const basePoints = typeof rpcData.base_points === 'number'
      ? rpcData.base_points
      : (isCorrect ? pointsAwarded : 0);
    const speedBonus = typeof rpcData.speed_bonus === 'number'
      ? rpcData.speed_bonus
      : (isCorrect ? Math.max(0, pointsAwarded - basePoints) : 0);
    const responseTimeMs = Number(rpcData.response_time_ms || 0);

    return {
      data: {
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        base_points: basePoints,
        speed_bonus: speedBonus,
        response_time_ms: responseTimeMs,
        current_score: Number(rpcData.current_score || 0),
        eligible_count: typeof rpcData.eligible_count === 'number' ? rpcData.eligible_count : undefined,
        answered_count: typeof rpcData.answered_count === 'number' ? rpcData.answered_count : undefined,
        all_answered: Boolean(rpcData.all_answered || rpcData.advance?.advanced),
        advanced: Boolean(rpcData.advanced || rpcData.advance?.advanced),
        next_question_index:
          typeof rpcData.next_question_index === 'number'
            ? rpcData.next_question_index
            : (typeof rpcData.advance?.current_question_index === 'number' ? rpcData.advance.current_question_index : undefined),
        is_finished: Boolean(rpcData.is_finished || rpcData.advance?.status === 'finished'),
        duplicate: Boolean(rpcData.duplicate || rpcData.code === 'DUPLICATE'),
        changed: Boolean(rpcData.changed || rpcData.code === 'CHANGED')
      }
    };
  }

  /**
   * Queries authoritative database records for the current question's student answers
   * and session participants (Part 3: Live Student Answer Counter source of truth).
   * Deduplicates by student_id so changing an answer never inflates the total count.
   */
  async getQuestionAnswerSnapshot(
    sessionId: string,
    questionIndex: number,
    teacherId?: string | null
  ): Promise<{
    joinedCount: number;
    answeredCount: number;
    notAnsweredCount: number;
    answeringPercentage: number;
    optionCounts: [number, number, number, number];
    studentOptionMap: Record<string, number>;
    participants: LiveQuizParticipant[];
  }> {
    const emptySnapshot = {
      joinedCount: 0,
      answeredCount: 0,
      notAnsweredCount: 0,
      answeringPercentage: 0,
      optionCounts: [0, 0, 0, 0] as [number, number, number, number],
      studentOptionMap: {} as Record<string, number>,
      participants: [] as LiveQuizParticipant[]
    };

    if (!supabase || !sessionId) return emptySnapshot;

    try {
      let hostId = teacherId || null;
      if (!hostId) {
        const { data: sRow } = await supabase
          .from('live_quiz_sessions')
          .select('teacher_id')
          .eq('id', sessionId)
          .maybeSingle();
        hostId = sRow?.teacher_id || null;
      }

      let partsQuery = supabase
        .from('live_quiz_participants')
        .select('*')
        .eq('session_id', sessionId);

      let ansQuery = supabase
        .from('live_quiz_answers')
        .select('student_id, selected_option_index, question_index, submitted_at')
        .eq('session_id', sessionId)
        .eq('question_index', questionIndex);

      if (hostId) {
        partsQuery = partsQuery.neq('student_id', hostId);
        ansQuery = ansQuery.neq('student_id', hostId);
      }

      const [partsRes, ansRes] = await Promise.all([
        partsQuery.order('score', { ascending: false }),
        ansQuery.order('submitted_at', { ascending: true })
      ]);

      const rawParticipants = (partsRes.data || []) as LiveQuizParticipant[];
      // Deduplicate participants by student_id
      const uniqueParticipantsMap = new Map<string, LiveQuizParticipant>();
      for (const p of rawParticipants) {
        if (hostId && p.student_id === hostId) continue;
        uniqueParticipantsMap.set(p.student_id, p);
      }

      // Deduplicate answers for this question by student_id (latest selection wins if changed)
      const studentOptionMap: Record<string, number> = {};
      for (const a of ansRes.data || []) {
        if (!a?.student_id || (hostId && a.student_id === hostId)) continue;
        const opt = Number(a.selected_option_index);
        if (opt >= 0 && opt <= 3) {
          studentOptionMap[a.student_id] = opt;
        }
      }

      const optionCounts: [number, number, number, number] = [0, 0, 0, 0];
      const uniqueAnsweredStudents = Object.keys(studentOptionMap);
      for (const sid of uniqueAnsweredStudents) {
        const opt = studentOptionMap[sid];
        if (opt >= 0 && opt <= 3) {
          optionCounts[opt] += 1;
        }
      }

      const answeredCount = uniqueAnsweredStudents.length;
      const joinedCount = Math.max(uniqueParticipantsMap.size, answeredCount);
      const notAnsweredCount = Math.max(0, joinedCount - answeredCount);
      const answeringPercentage = joinedCount > 0 ? Math.round((answeredCount / joinedCount) * 100) : 0;

      return {
        joinedCount,
        answeredCount,
        notAnsweredCount,
        answeringPercentage,
        optionCounts,
        studentOptionMap,
        participants: Array.from(uniqueParticipantsMap.values())
      };
    } catch (err) {
      console.warn('[LiveQuizService] getQuestionAnswerSnapshot notice:', err);
      return emptySnapshot;
    }
  }

  /**
   * Authoritative server snapshot (server clock, index, phase, deadline). Also acts as the
   * participant heartbeat and lazily applies server-side expiry / all-answered advancement
   * (no teacher browser required). Returns null if the v3 engine is not installed.
   */
  async getLiveState(sessionId: string): Promise<LiveQuizServerState | null> {
    if (!supabase || !sessionId) return null;
    try {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('get_live_quiz_state', { p_session_id: sessionId });
      const t1 = Date.now();
      if (error || !data) return null;
      const serverNow = Number(data.server_now_ms);
      // Offset estimate: server time at mid-flight minus local time at mid-flight.
      const offset = Number.isFinite(serverNow) ? serverNow - Math.round((t0 + t1) / 2) : 0;
      this.serverClockOffsetMs = offset;
      return { ...data, client_offset_ms: offset } as LiveQuizServerState;
    } catch {
      return null;
    }
  }

  /** Server time estimate (ms) for DISPLAY purposes only. */
  serverClockOffsetMs = 0;
  getServerNowMs(): number {
    return Date.now() + this.serverClockOffsetMs;
  }

  /**
   * Compare-and-swap advance. Host: forced skip. Others: only succeeds if the server
   * itself considers the question complete. Concurrent calls yield exactly one transition.
   */
  async advanceQuestion(
    sessionId: string,
    expectedIndex: number
  ): Promise<{ advanced: boolean; finished: boolean; reason?: string; next_question_index?: number }> {
    if (!supabase) return { advanced: false, finished: false, reason: 'no_supabase' };
    const { data, error } = await supabase.rpc('advance_live_quiz_question', {
      p_session_id: sessionId,
      p_expected_index: expectedIndex
    });
    if (error || !data) {
      console.error('[LiveQuizService] advance_live_quiz_question error:', error);
      return { advanced: false, finished: false, reason: 'rpc_error' };
    }
    return {
      advanced: Boolean(data.advanced),
      finished: Boolean(data.finished),
      reason: data.reason,
      next_question_index: data.next_question_index
    };
  }

  /**
   * Teacher triggers answer reveal (guarded by expectedQuestionIndex so a late reveal
   * never overwrites an already-advanced question).
   */
  async revealAnswer(
    sessionId: string,
    correctIndex: number,
    expectedQuestionIndex?: number
  ): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      let query = supabase
        .from('live_quiz_sessions')
        .update({
          status: 'reveal',
          correct_answer_index: correctIndex
        })
        .eq('id', sessionId)
        .eq('status', 'in_progress');

      if (typeof expectedQuestionIndex === 'number') {
        query = query.eq('current_question_index', expectedQuestionIndex);
      }

      const { error } = await query;

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to reveal answer' };
    }
  }

  /**
   * Internal helper that merges `live_quiz_results`, `live_quiz_participants`, and `live_quiz_answers`
   * so the final leaderboard ALWAYS includes every participant in deterministic descending order
   * (Part 6: prevents 1st-place-only partial rendering, handles ties and 0-point students).
   */
  private async buildCompleteOrderedLeaderboard(sessionId: string): Promise<LiveQuizResult[]> {
    if (!supabase || !sessionId) return [];

    const { data: sessionRow } = await supabase
      .from('live_quiz_sessions')
      .select('id, classroom_id, teacher_id, quiz_id, ended_at, created_at')
      .eq('id', sessionId)
      .maybeSingle();

    const hostId = sessionRow?.teacher_id || null;

    let totalQuestions = 1;
    if (sessionRow?.quiz_id) {
      const { count } = await supabase
        .from('live_quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', sessionRow.quiz_id);
      if (count && count > 0) totalQuestions = count;
    }

    let resultsQuery = supabase
      .from('live_quiz_results')
      .select(`
        *,
        student:profiles!student_id (id, full_name, avatar_url, email)
      `)
      .eq('session_id', sessionId);

    let partsQuery = supabase
      .from('live_quiz_participants')
      .select('*')
      .eq('session_id', sessionId);

    let ansQuery = supabase
      .from('live_quiz_answers')
      .select('*')
      .eq('session_id', sessionId);

    if (hostId) {
      resultsQuery = resultsQuery.neq('student_id', hostId);
      partsQuery = partsQuery.neq('student_id', hostId);
      ansQuery = ansQuery.neq('student_id', hostId);
    }

    const [resultsRes, partsRes, ansRes] = await Promise.all([
      resultsQuery,
      partsQuery,
      ansQuery
    ]);

    const existingResults = (resultsRes.data || []) as LiveQuizResult[];
    const participants = (partsRes.data || []) as LiveQuizParticipant[];
    const answers = (ansRes.data || []) as any[];

    // Aggregate answers per student
    const answerStats: Record<string, { correct: number; wrong: number; sumPoints: number; responseTimes: number[] }> = {};
    for (const a of answers) {
      if (!a?.student_id || (hostId && a.student_id === hostId)) continue;
      if (!answerStats[a.student_id]) {
        answerStats[a.student_id] = { correct: 0, wrong: 0, sumPoints: 0, responseTimes: [] };
      }
      const st = answerStats[a.student_id];
      if (a.is_correct) st.correct += 1;
      else st.wrong += 1;
      st.sumPoints += Number(a.points_awarded || 0);
      const rt = Number(a.response_time_ms || 0);
      if (rt > 0) st.responseTimes.push(rt);
    }

    // Build unified map of all unique student IDs across results, participants, and answers
    const allStudentIds = new Set<string>();
    const resultMap = new Map<string, LiveQuizResult>();
    const partMap = new Map<string, LiveQuizParticipant>();

    for (const r of existingResults) {
      if (hostId && r.student_id === hostId) continue;
      allStudentIds.add(r.student_id);
      resultMap.set(r.student_id, r);
    }
    for (const p of participants) {
      if (hostId && p.student_id === hostId) continue;
      allStudentIds.add(p.student_id);
      partMap.set(p.student_id, p);
    }
    for (const sid of Object.keys(answerStats)) {
      if (hostId && sid === hostId) continue;
      allStudentIds.add(sid);
    }

    // Fetch any missing student profiles in one batch if needed
    const missingProfileIds = Array.from(allStudentIds).filter((sid) => !resultMap.get(sid)?.student?.full_name);
    const profileMap = new Map<string, { id: string; full_name?: string | null; avatar_url?: string | null; email?: string | null }>();
    if (missingProfileIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', missingProfileIds);
        for (const pr of profs || []) {
          profileMap.set(pr.id, pr);
        }
      } catch {}
    }

    const mergedRows: Array<LiveQuizResult & { _joinedAtMs: number }> = [];
    for (const sid of allStudentIds) {
      const r = resultMap.get(sid);
      const p = partMap.get(sid);
      const st = answerStats[sid] || { correct: 0, wrong: 0, sumPoints: 0, responseTimes: [] };
      const prof = r?.student || profileMap.get(sid);

      const score = Math.max(Number(r?.score || 0), Number(p?.score || 0), st.sumPoints);
      const correctCount = Math.max(Number(r?.correct_count || 0), st.correct);
      const totalQ = Number(r?.total_questions || totalQuestions || 1);
      const wrongCount = Math.max(0, totalQ - correctCount);
      const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
      const computedAvgRt = st.responseTimes.length > 0
        ? Math.round(st.responseTimes.reduce((acc, v) => acc + v, 0) / st.responseTimes.length)
        : 0;
      const avgResponseTimeMs = Number(r?.avg_response_time_ms || computedAvgRt || 0);

      mergedRows.push({
        id: r?.id || `res_${sessionId}_${sid}`,
        session_id: sessionId,
        classroom_id: r?.classroom_id ?? sessionRow?.classroom_id ?? null,
        teacher_id: r?.teacher_id ?? hostId,
        student_id: sid,
        quiz_id: r?.quiz_id ?? sessionRow?.quiz_id ?? null,
        score,
        points_awarded: score,
        correct_count: correctCount,
        wrong_count: wrongCount,
        total_questions: totalQ,
        accuracy_percentage: accuracy,
        avg_response_time_ms: avgResponseTimeMs,
        final_rank: r?.final_rank || null,
        created_at: r?.created_at || sessionRow?.ended_at || new Date().toISOString(),
        student: {
          id: sid,
          full_name: prof?.full_name || p?.display_name || prof?.email || 'Student',
          avatar_url: prof?.avatar_url || p?.avatar_url || null,
          email: prof?.email || null
        },
        _joinedAtMs: p?.joined_at ? new Date(p.joined_at).getTime() : 0
      });
    }

    // Deterministic sort:
    // 1. score DESC
    // 2. correct_count DESC
    // 3. avg_response_time_ms ASC (faster wins ties; 0 sorted after positive times)
    // 4. joined_at ASC
    // 5. student_id ASC
    mergedRows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
      const aRt = (a.avg_response_time_ms || 0) > 0 ? (a.avg_response_time_ms as number) : 999999999;
      const bRt = (b.avg_response_time_ms || 0) > 0 ? (b.avg_response_time_ms as number) : 999999999;
      if (aRt !== bRt) return aRt - bRt;
      if (a._joinedAtMs !== b._joinedAtMs) return a._joinedAtMs - b._joinedAtMs;
      return String(a.student_id).localeCompare(String(b.student_id));
    });

    return mergedRows.map(({ _joinedAtMs, ...row }, idx) => ({
      ...row,
      final_rank: idx + 1
    }));
  }

  /**
   * Finish game, calculate stats, write live_quiz_results, and award classroom points.
   * Waits for the complete leaderboard for ALL participants before returning.
   */
  async finishQuiz(sessionId: string): Promise<{ data?: LiveQuizResult[]; error?: string }> {
    if (!supabase || !sessionId) return { error: 'Supabase is not configured' };

    try {
      // 1. Call Server-Authoritative RPC
      try {
        await supabase.rpc('finish_and_award_live_quiz', {
          p_session_id: sessionId
        });
      } catch (rpcErr) {
        console.warn('[LiveQuizService] finish_and_award_live_quiz RPC notice:', rpcErr);
      }

      // 2. Call server /complete endpoint to ensure batch upsert + classroom_points sync
      const { data: sessionRow } = await supabase
        .from('live_quiz_sessions')
        .select('id, classroom_id, teacher_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionRow) {
        const completeUrl = sessionRow.classroom_id
          ? `/api/classes/${sessionRow.classroom_id}/live-quiz/sessions/${sessionId}/complete`
          : `/api/live-quiz/sessions/${sessionId}/complete`;
        try {
          await authenticatedFetch(completeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch {}
      }

      // 3. Build and verify the complete ordered leaderboard for all participants
      const completeLeaderboard = await this.buildCompleteOrderedLeaderboard(sessionId);

      // Persist any missing or updated participant result rows in one batch
      if (completeLeaderboard.length > 0) {
        const upsertRows = completeLeaderboard.map((r) => ({
          session_id: r.session_id,
          classroom_id: r.classroom_id,
          teacher_id: r.teacher_id,
          student_id: r.student_id,
          quiz_id: r.quiz_id,
          score: r.score,
          points_awarded: r.points_awarded,
          correct_count: r.correct_count,
          wrong_count: r.wrong_count,
          total_questions: r.total_questions,
          accuracy_percentage: r.accuracy_percentage,
          final_rank: r.final_rank
        }));
        try {
          await supabase
            .from('live_quiz_results')
            .upsert(upsertRows, { onConflict: 'session_id,student_id' });
        } catch {}
      }

      return { data: completeLeaderboard };
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
  removeRealtimeChannel(channel: RealtimeChannel | null | undefined): void {
    if (!supabase || !channel) return;
    try {
      supabase.removeChannel(channel);
    } catch {
      try { channel.unsubscribe(); } catch {}
    }
  }

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
   * Merges with session participants so partial data is never returned.
   */
  async getResults(sessionId: string): Promise<{ data?: LiveQuizResult[]; error?: string }> {
    if (!supabase || !sessionId) return { data: [] };
    try {
      const completeLeaderboard = await this.buildCompleteOrderedLeaderboard(sessionId);
      return { data: completeLeaderboard };
    } catch (err: any) {
      return { error: err.message, data: [] };
    }
  }
}

export const liveQuizService = new LiveQuizService();
