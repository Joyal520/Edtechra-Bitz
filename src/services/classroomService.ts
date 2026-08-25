// ============================================================================
// EDTECHRA-BITZ: Classroom Service (Client-Side Database Operations)
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  Classroom,
  ClassroomMember,
  ClassroomInvite,
  ClassroomStats
} from '@/types/classroom';

class ClassroomService {
  /**
   * Helper to fetch authenticated user's ID
   */
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Generates a unique 6-character uppercase alphanumeric code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Retrieves all classrooms where the user is teacher or active member
   */
  async getClassrooms(filterRole?: 'teacher' | 'student'): Promise<Classroom[]> {
    if (!supabase) return [];
    const userId = await this.getUserId();
    if (!userId) return [];

    try {
      // 1. Fetch classrooms where user is teacher
      const { data: teacherClasses, error: teacherError } = await supabase
        .from('classrooms')
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, email, avatar_url)
        `)
        .eq('teacher_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (teacherError) throw teacherError;

      // 2. Fetch memberships where user is enrolled as student
      const { data: memberships, error: memberError } = await supabase
        .from('classroom_members')
        .select(`
          classroom_id,
          role,
          classroom:classrooms!classroom_id (
            *,
            teacher:profiles!teacher_id (id, full_name, email, avatar_url)
          )
        `)
        .eq('profile_id', userId)
        .eq('status', 'active');

      if (memberError) throw memberError;

      const studentClasses: Classroom[] = (memberships || [])
        .filter((m: any) => m.classroom && !m.classroom.is_archived && m.role === 'student')
        .map((m: any) => ({
          ...m.classroom,
          user_role: 'student' as const
        }));

      const teacherResult: Classroom[] = (teacherClasses || []).map((c: any) => ({
        ...c,
        user_role: 'teacher' as const
      }));

      // Enrich with counts
      const allClasses = filterRole === 'teacher'
        ? teacherResult
        : filterRole === 'student'
          ? studentClasses
          : [...teacherResult, ...studentClasses];

      return await this.enrichClassroomsWithCounts(allClasses);
    } catch (err) {
      console.error('[ClassroomService] getClassrooms error:', err);
      return [];
    }
  }

  /**
   * Retrieves a single classroom by ID with full details
   */
  async getClassroomById(classroomId: string): Promise<Classroom | null> {
    if (!supabase || !classroomId) return null;
    const userId = await this.getUserId();

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, email, avatar_url)
        `)
        .eq('id', classroomId)
        .maybeSingle();

      if (error || !data) return null;

      // Check user role
      let userRole: 'teacher' | 'student' = data.teacher_id === userId ? 'teacher' : 'student';
      if (userId && userRole === 'student') {
        const { data: mem } = await supabase
          .from('classroom_members')
          .select('role')
          .eq('classroom_id', classroomId)
          .eq('profile_id', userId)
          .maybeSingle();
        if (mem?.role === 'teacher' || mem?.role === 'co-teacher') {
          userRole = 'teacher';
        }
      }

      const enriched = await this.enrichClassroomsWithCounts([data]);
      return {
        ...enriched[0],
        user_role: userRole
      };
    } catch (err) {
      console.error('[ClassroomService] getClassroomById error:', err);
      return null;
    }
  }

  /**
   * Enriches classroom list with student counts and assignment counts
   */
  private async enrichClassroomsWithCounts(classrooms: Classroom[]): Promise<Classroom[]> {
    if (!supabase || classrooms.length === 0) return classrooms;

    const ids = classrooms.map((c) => c.id);

    try {
      const [membersRes, assignmentsRes] = await Promise.all([
        supabase
          .from('classroom_members')
          .select('classroom_id')
          .in('classroom_id', ids)
          .eq('status', 'active')
          .eq('role', 'student'),
        supabase
          .from('assignments')
          .select('classroom_id')
          .in('classroom_id', ids)
          .eq('is_deleted', false)
      ]);

      const memberCounts: Record<string, number> = {};
      (membersRes.data || []).forEach((m: any) => {
        memberCounts[m.classroom_id] = (memberCounts[m.classroom_id] || 0) + 1;
      });

      const assignmentCounts: Record<string, number> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        assignmentCounts[a.classroom_id] = (assignmentCounts[a.classroom_id] || 0) + 1;
      });

      return classrooms.map((c) => ({
        ...c,
        student_count: memberCounts[c.id] || 0,
        assignment_count: assignmentCounts[c.id] || 0
      }));
    } catch (err) {
      console.warn('[ClassroomService] enrichClassroomsWithCounts notice:', err);
      return classrooms;
    }
  }

  /**
   * Creates a new classroom
   */
  async createClassroom(payload: {
    title: string;
    subject: string;
    grade: string;
    theme?: string;
    description?: string;
  }): Promise<{ data?: Classroom; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'You must be logged in to create a classroom' };

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: userId,
          title: payload.title.trim(),
          subject: payload.subject.trim(),
          grade: payload.grade.trim(),
          theme: payload.theme || 'theme-blue',
          description: (payload.description || '').trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add teacher as owner member
      await supabase.from('classroom_members').insert({
        classroom_id: data.id,
        profile_id: userId,
        role: 'teacher',
        status: 'active'
      });

      // Generate initial invite code
      await this.getOrCreateInvite(data.id);

      return { data };
    } catch (err: any) {
      console.error('[ClassroomService] createClassroom error:', err);
      return { error: err.message || 'Failed to create classroom.' };
    }
  }

  /**
   * Updates classroom details
   */
  async updateClassroom(
    classroomId: string,
    updates: Partial<{
      title: string;
      subject: string;
      grade: string;
      theme: string;
      description: string;
      banner_url: string;
    }>
  ): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', classroomId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update classroom.' };
    }
  }

  /**
   * Archives or deletes a classroom
   */
  async archiveClassroom(classroomId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq('id', classroomId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to archive classroom.' };
    }
  }

  async deleteClassroom(classroomId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete classroom.' };
    }
  }

  /**
   * Retrieves enrolled students for a classroom
   */
  async getClassroomMembers(classroomId: string): Promise<ClassroomMember[]> {
    if (!supabase || !classroomId) return [];

    try {
      const { data, error } = await supabase
        .from('classroom_members')
        .select(`
          *,
          profile:profiles!profile_id (id, email, full_name, avatar_url, role)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Fetch points for each member
      const { data: pointsData } = await supabase
        .from('classroom_points')
        .select('student_id, points')
        .eq('classroom_id', classroomId);

      const pointsMap: Record<string, number> = {};
      (pointsData || []).forEach((p: any) => {
        pointsMap[p.student_id] = (pointsMap[p.student_id] || 0) + Number(p.points || 0);
      });

      return (data || []).map((m: any) => ({
        ...m,
        points: pointsMap[m.profile_id] || 0
      }));
    } catch (err) {
      console.error('[ClassroomService] getClassroomMembers error:', err);
      return [];
    }
  }

  /**
   * Removes a member from the classroom
   */
  async removeMember(classroomId: string, memberProfileId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('profile_id', memberProfileId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to remove student.' };
    }
  }

  /**
   * Retrieves or creates an active invite code for a classroom
   */
  async getOrCreateInvite(classroomId: string): Promise<ClassroomInvite | null> {
    if (!supabase || !classroomId) return null;
    const userId = await this.getUserId();

    try {
      const { data: existing } = await supabase
        .from('classroom_invites')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) return existing;

      if (!userId) return null;

      const newCode = this.generateInviteCode();
      const { data: created, error } = await supabase
        .from('classroom_invites')
        .insert({
          classroom_id: classroomId,
          invite_code: newCode,
          created_by: userId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    } catch (err) {
      console.error('[ClassroomService] getOrCreateInvite error:', err);
      return null;
    }
  }

  /**
   * Joins a student to a classroom via 6-digit invite code or direct classroom ID
   */
  async joinClassroomByCode(codeOrId: string): Promise<{ data?: Classroom; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'You must log in to join a classroom.' };

    try {
      const cleanCode = codeOrId.trim().toUpperCase();

      // Look up invite code
      let targetClassroomId: string | null = null;

      const { data: invite } = await supabase
        .from('classroom_invites')
        .select('classroom_id, is_active, max_uses, uses_count, expires_at')
        .eq('invite_code', cleanCode)
        .maybeSingle();

      if (invite && invite.is_active) {
        targetClassroomId = invite.classroom_id;
      } else {
        // Direct UUID fallback
        const { data: classDirect } = await supabase
          .from('classrooms')
          .select('id')
          .eq('id', codeOrId.trim())
          .maybeSingle();

        if (classDirect) {
          targetClassroomId = classDirect.id;
        }
      }

      if (!targetClassroomId) {
        return { error: 'Invalid or expired classroom invite code.' };
      }

      // Insert membership record
      const { error: joinError } = await supabase
        .from('classroom_members')
        .upsert(
          {
            classroom_id: targetClassroomId,
            profile_id: userId,
            role: 'student',
            status: 'active'
          },
          { onConflict: 'classroom_id,profile_id' }
        );

      if (joinError) throw joinError;

      // Increment invite uses
      if (invite) {
        await supabase
          .from('classroom_invites')
          .update({ uses_count: (invite.uses_count || 0) + 1 })
          .eq('invite_code', cleanCode);
      }

      const classroom = await this.getClassroomById(targetClassroomId);
      return { data: classroom || undefined };
    } catch (err: any) {
      console.error('[ClassroomService] joinClassroomByCode error:', err);
      return { error: err.message || 'Failed to join classroom.' };
    }
  }

  /**
   * Retrieves overall stats for teacher dashboard
   */
  async getClassroomStats(classroomId?: string): Promise<ClassroomStats> {
    if (!supabase) {
      return {
        total_students: 0,
        total_assignments: 0,
        total_submissions: 0,
        average_completion_percent: 0,
        average_score: 0
      };
    }

    try {
      let membersQuery = supabase
        .from('classroom_members')
        .select('id, profile_id', { count: 'exact' })
        .eq('status', 'active')
        .eq('role', 'student');

      let assignmentsQuery = supabase
        .from('assignments')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false);

      let submissionsQuery = supabase
        .from('assignment_submissions')
        .select('id, points_awarded', { count: 'exact' });

      if (classroomId) {
        membersQuery = membersQuery.eq('classroom_id', classroomId);
        assignmentsQuery = assignmentsQuery.eq('classroom_id', classroomId);
        submissionsQuery = submissionsQuery.eq('classroom_id', classroomId);
      }

      const [membersRes, assignmentsRes, submissionsRes] = await Promise.all([
        membersQuery,
        assignmentsQuery,
        submissionsQuery
      ]);

      const totalStudents = membersRes.count || 0;
      const totalAssignments = assignmentsRes.count || 0;
      const totalSubmissions = submissionsRes.count || 0;

      const potentialSubmissions = totalStudents * totalAssignments;
      const completionPercent = potentialSubmissions > 0
        ? Math.min(100, Math.round((totalSubmissions / potentialSubmissions) * 100))
        : 0;

      const scoredSubmissions = (submissionsRes.data || []).filter((s: any) => typeof s.points_awarded === 'number');
      const avgScore = scoredSubmissions.length > 0
        ? Math.round(scoredSubmissions.reduce((acc: number, s: any) => acc + s.points_awarded, 0) / scoredSubmissions.length)
        : 0;

      return {
        total_students: totalStudents,
        total_assignments: totalAssignments,
        total_submissions: totalSubmissions,
        average_completion_percent: completionPercent,
        average_score: avgScore
      };
    } catch (err) {
      console.warn('[ClassroomService] getClassroomStats fallback:', err);
      return {
        total_students: 0,
        total_assignments: 0,
        total_submissions: 0,
        average_completion_percent: 0,
        average_score: 0
      };
    }
  }
}

export const classroomService = new ClassroomService();
