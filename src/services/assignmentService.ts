// ============================================================================
// EDTECHRA-BITZ: Assignment & Submissions Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  Assignment,
  AssignmentSubmission,
  AssignmentType,
  AssignmentAttachment
} from '@/types/classroom';
import { classroomPointsService } from './classroomPointsService';

class AssignmentService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Retrieves all active assignments for a classroom
   */
  async getAssignmentsByClassroom(classroomId: string): Promise<Assignment[]> {
    if (!supabase || !classroomId) return [];
    const userId = await this.getUserId();

    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('is_deleted', false)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const assignments = data || [];
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
      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert(
          {
            assignment_id: payload.assignment_id,
            classroom_id: payload.classroom_id,
            student_id: userId,
            text_response: (payload.text_response || '').trim(),
            file_urls: payload.file_urls || [],
            status: 'submitted',
            submitted_at: new Date().toISOString(),
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
    teacher_feedback?: string;
    assignment_title?: string;
  }): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();

    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          points_awarded: payload.points_awarded,
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
