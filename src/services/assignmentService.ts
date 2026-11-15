// ============================================================================
// EDTECHRA-BITZ: Assignment & Submissions Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/apiAuth';
import {
  Assignment,
  AssignmentSubmission,
  AssignmentType,
  AssignmentAttachment
} from '@/types/classroom';
import { classroomPointsService } from './classroomPointsService';
import { isAssignmentPublished } from '@/utils/gameLevelUtils';

class AssignmentService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  private async isTeacherForClassroom(classroomId: string, userId: string | null): Promise<boolean> {
    if (!supabase || !userId) return false;
    try {
      const [{ data: classroomRow }, { data: memberRow }, { data: profileRow }] = await Promise.all([
        supabase.from('classrooms').select('teacher_id').eq('id', classroomId).maybeSingle(),
        supabase
          .from('classroom_members')
          .select('role')
          .eq('classroom_id', classroomId)
          .eq('profile_id', userId)
          .maybeSingle(),
        supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      ]);

      return (
        classroomRow?.teacher_id === userId ||
        memberRow?.role === 'teacher' ||
        memberRow?.role === 'co-teacher' ||
        profileRow?.role === 'admin'
      );
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all active assignments for a classroom
   */
  async getAssignmentsByClassroom(classroomId: string): Promise<Assignment[]> {
    if (!supabase || !classroomId) return [];
    const userId = await this.getUserId();

    try {
      const [{ data, error }, userIsTeacher] = await Promise.all([
        supabase
          .from('assignments')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('is_deleted', false)
          .order('due_date', { ascending: true, nullsFirst: false }),
        this.isTeacherForClassroom(classroomId, userId)
      ]);

      if (error) throw error;

      // Enforce publication visibility at service layer: students only receive published assignments
      const rawAssignments = data || [];
      const assignments = userIsTeacher
        ? rawAssignments
        : rawAssignments.filter((a) => isAssignmentPublished(a));
      if (assignments.length === 0) return [];

      const assignmentIds = assignments.map((a) => a.id);

      // Fetch all submissions count and graded count
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, status, points_awarded, text_response, file_urls, teacher_feedback, submitted_at, graded_at')
        .in('assignment_id', assignmentIds);

      const subList = submissions || [];
      const subCountMap: Record<string, number> = {};
      const gradedCountMap: Record<string, number> = {};
      const mySubMap: Record<string, AssignmentSubmission> = {};

      subList.forEach((s: any) => {
        subCountMap[s.assignment_id] = (subCountMap[s.assignment_id] || 0) + 1;
        if (s.status === 'graded') {
          gradedCountMap[s.assignment_id] = (gradedCountMap[s.assignment_id] || 0) + 1;
        }
        if (userId && s.student_id === userId) {
          mySubMap[s.assignment_id] = s;
        }
      });

      return assignments.map((a) => ({
        ...a,
        submission_count: subCountMap[a.id] || 0,
        graded_count: gradedCountMap[a.id] || 0,
        my_submission: mySubMap[a.id] || null
      }));
    } catch (err) {
      console.error('[AssignmentService] getAssignmentsByClassroom error:', err);
      return [];
    }
  }

  /**
   * Creates a new assignment
   */
  async createAssignment(payload: {
    classroom_id: string;
    title: string;
    instructions?: string;
    assignment_type?: AssignmentType;
    points?: number;
    due_date?: string | null;
    attachment_urls?: AssignmentAttachment[];
  }): Promise<{ data?: Assignment; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          classroom_id: payload.classroom_id,
          title: payload.title.trim(),
          instructions: (payload.instructions || '').trim(),
          assignment_type: payload.assignment_type || 'task',
          points: payload.points || 100,
          due_date: payload.due_date || null,
          attachment_urls: payload.attachment_urls || [],
          created_by: userId,
          status: 'published'
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[AssignmentService] createAssignment error:', err);
      return { error: err.message || 'Failed to create assignment.' };
    }
  }

  /**
   * Updates an assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<{
      title: string;
      instructions: string;
      points: number;
      due_date: string | null;
      attachment_urls: AssignmentAttachment[];
    }>
  ): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update assignment.' };
    }
  }

  /**
   * Publishes, unpublishes, or republishes an assignment without deleting
   * game configuration, library copy, student submissions, or leaderboard points.
   */
  async setAssignmentPublishStatus(
    assignmentId: string,
    publish: boolean
  ): Promise<{ assignment?: Assignment; error?: string }> {
    try {
      const apiRes = await authenticatedFetch(
        `/api/games/assignments/${assignmentId}/publish-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish })
        }
      );
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.success && json?.assignment) {
          return { assignment: json.assignment as Assignment };
        }
      } else if (apiRes.status === 403 || apiRes.status === 404) {
        const errJson = await apiRes.json().catch(() => ({}));
        return { error: errJson?.error || 'Unable to update publication status.' };
      }
    } catch {
      // Fallback to direct Supabase client below when running offline/without API server
    }

    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('assignments')
        .select('id, settings, status, is_deleted')
        .eq('id', assignmentId)
        .eq('is_deleted', false)
        .single();

      if (fetchErr || !existing) {
        return { error: fetchErr?.message || 'Assignment not found.' };
      }

      const nowIso = new Date().toISOString();
      const prevSettings =
        existing.settings && typeof existing.settings === 'object' ? existing.settings : {};
      const nextSettings = {
        ...prevSettings,
        is_unpublished: !publish,
        ...(publish ? { republished_at: nowIso } : { unpublished_at: nowIso })
      };

      const { data: updated, error: updErr } = await supabase
        .from('assignments')
        .update({
          status: publish ? 'published' : 'draft',
          settings: nextSettings,
          updated_at: nowIso
        })
        .eq('id', assignmentId)
        .select('*')
        .single();

      if (updErr) throw updErr;
      return { assignment: updated as Assignment };
    } catch (err: any) {
      return { error: err.message || 'Failed to update publishing status.' };
    }
  }

  /**
   * Performs a live publication check before opening a game/task from a potentially stale announcement link
   */
  async checkAssignmentPublishedLive(
    assignmentId: string
  ): Promise<{ published: boolean; assignment?: Assignment; reason?: string }> {
    if (!supabase || !assignmentId) {
      return { published: true };
    }
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .maybeSingle();

      if (error || !data || data.is_deleted) {
        return { published: false, reason: 'This activity is no longer available.' };
      }
      if (!isAssignmentPublished(data as Assignment)) {
        return {
          published: false,
          assignment: data as Assignment,
          reason: 'This activity was unpublished by your teacher and is currently unavailable.'
        };
      }
      return { published: true, assignment: data as Assignment };
    } catch {
      return { published: true };
    }
  }

  /**
   * Performs a live publication check for competitions before opening from a cached stream link
   */
  async checkChallengePublishedLive(
    challengeId: string
  ): Promise<{ published: boolean; reason?: string }> {
    if (!supabase || !challengeId) return { published: true };
    try {
      const { data, error } = await supabase
        .from('ai_challenges')
        .select('id, status')
        .eq('id', challengeId)
        .maybeSingle();

      if (error || !data) {
        return { published: false, reason: 'This competition is no longer available.' };
      }
      const st = String(data.status || '').toLowerCase();
      if (['draft', 'archived', 'deleted', 'closed'].includes(st)) {
        return {
          published: false,
          reason: 'This competition was unpublished by your teacher and is currently unavailable.'
        };
      }
      return { published: true };
    } catch {
      return { published: true };
    }
  }

  /**
   * Soft-deletes an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase
        .from('assignments')
        .update({
          is_deleted: true,
          status: 'deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete assignment.' };
    }
  }

  /**
   * Retrieves all student submissions for an assignment (Teacher view)
   */
  async getSubmissionsByAssignment(assignmentId: string): Promise<AssignmentSubmission[]> {
    if (!supabase || !assignmentId) return [];

    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:profiles!student_id (id, full_name, email, avatar_url)
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[AssignmentService] getSubmissionsByAssignment error:', err);
      return [];
    }
  }

  /**
   * Student submits or updates work for an assignment
   */
  async submitAssignment(payload: {
    assignment_id: string;
    classroom_id: string;
    text_response?: string;
    file_urls?: AssignmentAttachment[];
  }): Promise<{ data?: AssignmentSubmission; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'You must be logged in to submit work.' };

    try {
      // Check if student has already submitted this assignment
      const { data: existing } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', payload.assignment_id)
        .eq('student_id', userId)
        .maybeSingle();

      if (existing && (existing.status === 'submitted' || existing.status === 'graded' || existing.status === 'completed')) {
        return {
          data: existing,
          error: 'You have already submitted this task. Duplicate submissions are not allowed.'
        };
      }

      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert(
          {
            ...(existing?.id ? { id: existing.id } : {}),
            assignment_id: payload.assignment_id,
            classroom_id: payload.classroom_id,
            student_id: userId,
            text_response: (payload.text_response || '').trim(),
            file_urls: payload.file_urls || [],
            status: 'submitted',
            submitted_at: existing?.submitted_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'assignment_id,student_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[AssignmentService] submitAssignment error:', err);
      return { error: err.message || 'Failed to submit assignment.' };
    }
  }

  /**
   * Teacher grades a student submission and awards points
   */
  async gradeSubmission(payload: {
    submission_id: string;
    classroom_id: string;
    student_id: string;
    points_awarded: number;
    max_points?: number;
    teacher_feedback?: string;
    assignment_title?: string;
  }): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();

    try {
      let maxScore: number = payload.max_points || 0;
      if (maxScore <= 0) {
        const { data: subData } = await supabase
          .from('assignment_submissions')
          .select('assignment:assignments(points)')
          .eq('id', payload.submission_id)
          .maybeSingle();
        maxScore = Number((subData as any)?.assignment?.points) || 100;
      }

      const finalScore = payload.points_awarded;
      const percentage = maxScore > 0 ? Math.min(100, Math.max(0, Math.round((finalScore / maxScore) * 100))) : 100;

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          points_awarded: payload.points_awarded,
          final_score: finalScore,
          percentage: percentage,
          teacher_feedback: (payload.teacher_feedback || '').trim(),
          status: 'graded',
          graded_by: userId,
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.submission_id);

      if (error) throw error;

      // Award points in points ledger
      if (payload.points_awarded > 0) {
        await classroomPointsService.awardPoints({
          classroom_id: payload.classroom_id,
          student_id: payload.student_id,
          points: payload.points_awarded,
          reason: `Score on: ${payload.assignment_title || 'Assignment'}`,
          source_type: 'assignment',
          source_id: payload.submission_id
        });
      }

      return {};
    } catch (err: any) {
      console.error('[AssignmentService] gradeSubmission error:', err);
      return { error: err.message || 'Failed to grade submission.' };
    }
  }
}

export const assignmentService = new AssignmentService();
