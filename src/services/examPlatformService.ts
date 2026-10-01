// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: FRONTEND PLATFORM SERVICE
// Client service for exam lifecycle, session persistence, autosave & grading
// ============================================================================

import { supabase } from '@/lib/supabase';
import { CanonicalExamV1 } from '@/components/exam/shared/ExamSchema';

import { sanitizeAnswersForPayload, sanitizeExamForPayload } from '@/utils/examPayloadSanitizer';

class ExamPlatformService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token: string | undefined = undefined;
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
    }
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || localStorage.getItem('token') || undefined;
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Initializes a student examination attempt session and retrieves authoritative timer expiry
   */
  async startExamAttempt(payload: {
    examId: string;
    classroomId: string;
    password?: string;
  }): Promise<{
    attemptId?: string;
    attemptNumber?: number;
    startedAt: string;
    expiresAt: string;
    durationMinutes: number;
    savedAnswers?: Record<string, any>;
    bookmarkedIds?: string[];
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/exams/start-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 403 || errJson.code === 'EXAM_SCHEDULED_NOT_STARTED') {
          throw new Error(errJson.error || 'This examination has not started yet. Please wait for the scheduled start time.');
        }
      }
    } catch (e: any) {
      if (e.message?.includes('not started yet') || e.message?.includes('scheduled')) {
        throw e;
      }
      console.warn('[ExamPlatformService] startExamAttempt API fallback to Supabase:', e);
    }

    // Direct Supabase fallback
    const userId = await this.getUserId();
    const now = new Date();
    let durationMinutes = 45;
    let expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    if (supabase && userId) {
      // Check if exam is scheduled in the future or already ended
      const { data: examRow } = await supabase
        .from('classroom_exams')
        .select('starts_at, duration_minutes, ends_at')
        .eq('id', payload.examId)
        .maybeSingle();

      durationMinutes = examRow?.duration_minutes || 45;
      expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

      if (examRow?.starts_at && new Date(examRow.starts_at).getTime() > now.getTime()) {
        throw new Error('This examination has not started yet. Please wait for the scheduled start time.');
      }

      if (examRow?.ends_at) {
        const endsAtTime = new Date(examRow.ends_at).getTime();
        if (endsAtTime <= now.getTime()) {
          throw new Error('This examination has already ended.');
        }
        if (expiresAt.getTime() > endsAtTime) {
          expiresAt = new Date(endsAtTime);
        }
      }
      // Check existing in-progress attempt
      const { data: existing } = await supabase
        .from('classroom_exam_results')
        .select('*')
        .eq('exam_id', payload.examId)
        .eq('student_id', userId)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (existing) {
        return {
          attemptId: existing.id,
          attemptNumber: existing.attempt_number || 1,
          startedAt: existing.started_at || now.toISOString(),
          expiresAt: existing.expires_at || expiresAt.toISOString(),
          durationMinutes,
          savedAnswers: existing.session_answers || existing.answers || {},
          bookmarkedIds: existing.bookmarked_question_ids || []
        };
      }

      // Create new attempt
      const { data: newAttempt } = await supabase
        .from('classroom_exam_results')
        .insert({
          exam_id: payload.examId,
          classroom_id: payload.classroomId,
          student_id: userId,
          status: 'in_progress',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          session_answers: {},
          bookmarked_question_ids: []
        })
        .select()
        .maybeSingle();

      if (newAttempt) {
        return {
          attemptId: newAttempt.id,
          attemptNumber: newAttempt.attempt_number || 1,
          startedAt: newAttempt.started_at,
          expiresAt: newAttempt.expires_at,
          durationMinutes,
          savedAnswers: {},
          bookmarkedIds: []
        };
      }
    }

    return {
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationMinutes
    };
  }

  /**
   * Continuous debounced autosave of student answers and bookmarks
   */
  async autosaveAttemptAnswers(payload: {
    examId: string;
    attemptId?: string;
    answers: Record<string, any>;
    bookmarkedIds: string[];
  }): Promise<void> {
    const cleanAnswers = sanitizeAnswersForPayload(payload.answers);
    const cleanBookmarks = Array.isArray(payload.bookmarkedIds)
      ? payload.bookmarkedIds.map(String)
      : [];

    const cleanPayload = {
      examId: String(payload.examId || ''),
      attemptId: payload.attemptId ? String(payload.attemptId) : undefined,
      answers: cleanAnswers,
      bookmarkedIds: cleanBookmarks
    };

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/exams/attempts/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(cleanPayload)
      });

      if (res.ok) return;
    } catch (e) {
      console.warn('[ExamPlatformService] autosave fallback to Supabase:', e);
    }

    // Direct Supabase fallback
    if (supabase && payload.attemptId) {
      try {
        await supabase
          .from('classroom_exam_results')
          .update({
            session_answers: cleanAnswers,
            bookmarked_question_ids: cleanBookmarks,
            last_synced_at: new Date().toISOString()
          })
          .eq('id', payload.attemptId);
      } catch (err) {
        console.warn('[ExamPlatformService] direct update warning:', err);
      }
    }
  }

  /**
   * Final exam submission with authoritative server-side deterministic grading
   */
  async submitExamAttempt(payload: {
    examId: string;
    classroomId: string;
    exam: any;
    answers: Record<string, any>;
  }): Promise<any> {
    const cleanAnswers = sanitizeAnswersForPayload(payload.answers);
    const cleanExam = sanitizeExamForPayload(payload.exam);

    const cleanPayload = {
      examId: String(payload.examId || ''),
      classroomId: String(payload.classroomId || ''),
      exam: cleanExam,
      answers: cleanAnswers
    };

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/exam-engine?action=submit-student-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(cleanPayload)
      });

      const data = await res.json();
      if (res.ok && (data.success || data.score !== undefined)) {
        const { classroomExamService } = await import('./classroomExamService');
        return classroomExamService.normalizeExamResult(data);
      }
      if (!res.ok && data.error) {
        console.warn('[ExamPlatformService] submitExamAttempt server returned error, trying Supabase fallback:', data.error);
      }
    } catch (e) {
      console.warn('[ExamPlatformService] submitExamAttempt network error, falling back to Supabase:', e);
    }

    // Fallback: direct Supabase submission via classroomExamService.submitExam2
    const { classroomExamService } = await import('./classroomExamService');
    const directResult = await classroomExamService.submitExam2({
      examId: cleanPayload.examId,
      classroomId: cleanPayload.classroomId,
      exam: cleanExam,
      answers: cleanAnswers
    });

    if (!directResult) {
      throw new Error('Failed to submit exam attempt.');
    }

    return directResult;
  }

  /**
   * Publishes new exam to classroom
   */
  async publishExam(payload: {
    classroomId: string;
    canonicalExam: CanonicalExamV1;
    schedule?: { startsAt?: string; endsAt?: string };
  }): Promise<{ id: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/exams/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to publish exam.');
    }

    return data;
  }

  /**
   * Teacher manual evaluation for subjective questions
   */
  async gradeSubjectiveAnswer(payload: {
    resultId: string;
    subjectiveScores: Record<string, number>;
    subjectiveFeedbacks: Record<string, string>;
    generalFeedback?: string;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/exams/results/grade-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save manual grade.');
    }
  }
}

export const examPlatformService = new ExamPlatformService();
