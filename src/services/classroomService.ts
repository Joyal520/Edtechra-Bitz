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
import { optimizeImageForUpload } from '@/utils/imageOptimization';

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
      banner_url: string | null;
      classroom_header_image: string | null;
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
   * Helper to retrieve authorization header with current Supabase JWT session
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Uploads a custom classroom cover image to Cloudflare R2
   */
  async uploadClassroomCover(
    classroomId: string,
    file: File
  ): Promise<{ publicUrl?: string; storageKey?: string; error?: string }> {
    try {
      // 1. Optimize image for upload (responsive webp compression)
      const optimized = await optimizeImageForUpload(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'image/webp'
      });

      // 2. Request presigned upload URL from backend
      const headers = await this.getAuthHeaders();
      const presignRes = await fetch('/api/classes/presign-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classroomId: classroomId || 'general',
          filename: optimized.file.name.replace(/\.[^/.]+$/, "") + '.webp',
          contentType: optimized.mimeType,
          size: optimized.optimizedSize
        })
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson.success) {
        return { error: presignJson.error || 'Failed to prepare cover upload credentials.' };
      }

      const { uploadUrl, publicUrl, objectKey } = presignJson.data;

      // 3. Binary PUT directly to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': optimized.mimeType
        },
        body: optimized.blob
      });

      if (!uploadRes.ok) {
        return { error: `Direct storage upload failed with status ${uploadRes.status}` };
      }

      return { publicUrl, storageKey: objectKey };
    } catch (err: any) {
      console.error('[ClassroomService] uploadClassroomCover error:', err);
      return { error: err.message || 'Cover image could not be uploaded. Please try again.' };
    }
  }

  /**
   * Safely cleans up replaced or removed classroom cover image from Cloudflare R2
   */
  async cleanupClassroomCover(bannerUrl?: string | null): Promise<void> {
    if (!bannerUrl || typeof bannerUrl !== 'string') return;
    try {
      // Extract object key if the URL belongs to classrooms R2 storage
      const match = bannerUrl.match(/(classrooms\/[^?#]+)/);
      if (!match) return;
      const objectKey = match[1];

      const headers = await this.getAuthHeaders();
      await fetch('/api/classes/cleanup-file', {
        method: 'POST',
        headers,
        body: JSON.stringify({ objectKey })
      });
    } catch (err) {
      // Cleanup failure is non-fatal and should never interrupt user workflows
      console.warn('[ClassroomService] Non-fatal cover cleanup notice:', err);
    }
  }

  /**
   * Uploads a dedicated full-bleed classroom header image to Cloudflare R2
   */
  async uploadClassroomHeaderImage(
    classroomId: string,
    file: File
  ): Promise<{ publicUrl?: string; storageKey?: string; error?: string }> {
    try {
      // 1. Optimize image for wide header aspect ratio (up to 2560x1080)
      const optimized = await optimizeImageForUpload(file, {
        maxWidth: 2560,
        maxHeight: 1200,
        quality: 0.88,
        format: 'image/webp'
      });

      // 2. Request presigned upload URL from backend
      const headers = await this.getAuthHeaders();
      const presignRes = await fetch('/api/classes/presign-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classroomId: classroomId || 'general',
          filename: `header_${optimized.file.name.replace(/\.[^/.]+$/, '')}.webp`,
          contentType: optimized.mimeType,
          size: optimized.optimizedSize
        })
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson.success) {
        return { error: presignJson.error || 'Failed to prepare header upload credentials.' };
      }

      const { uploadUrl, publicUrl, objectKey } = presignJson.data;

      // 3. Binary PUT directly to Cloudflare R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': optimized.mimeType
        },
        body: optimized.blob
      });

      if (!uploadRes.ok) {
        return { error: `Direct storage upload failed with status ${uploadRes.status}` };
      }

      return { publicUrl, storageKey: objectKey };
    } catch (err: any) {
      console.error('[ClassroomService] uploadClassroomHeaderImage error:', err);
      return { error: err.message || 'Header image could not be uploaded. Please try again.' };
    }
  }

  /**
   * Safely cleans up replaced or reset classroom header image from Cloudflare R2
   */
  async cleanupClassroomHeaderImage(headerUrl?: string | null): Promise<void> {
    if (!headerUrl || typeof headerUrl !== 'string') return;
    try {
      const match = headerUrl.match(/(classrooms\/[^?#]+)/);
      if (!match) return;
      const objectKey = match[1];

      const headers = await this.getAuthHeaders();
      await fetch('/api/classes/cleanup-file', {
        method: 'POST',
        headers,
        body: JSON.stringify({ objectKey })
      });
    } catch (err) {
      console.warn('[ClassroomService] Non-fatal header cleanup notice:', err);
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
  async getClassroomMembers(classroomId: string, options?: { throwOnError?: boolean }): Promise<ClassroomMember[]> {
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
      if (options?.throwOnError) throw err;
      return [];
    }
  }

  /**
   * Removes multiple members from the classroom atomically and verifies permanent deletion from database.
   * Student accounts, grades, certificates, completed activities, and quiz submissions are preserved.
   */
  async removeMembers(
    classroomId: string,
    memberProfileIds: string[]
  ): Promise<{ success: boolean; removedCount: number; removedProfileIds: string[]; error?: string }> {
    if (!supabase) return { success: false, removedCount: 0, removedProfileIds: [], error: 'Supabase is not configured' };
    if (!classroomId) return { success: false, removedCount: 0, removedProfileIds: [], error: 'Classroom ID is required' };

    const targetIds = Array.from(new Set((memberProfileIds || []).filter(Boolean)));
    if (targetIds.length === 0) {
      return { success: false, removedCount: 0, removedProfileIds: [], error: 'No student profiles selected' };
    }

    try {
      // 1. Try calling the backend endpoint first (handles auth check, RPC, and verification atomically)
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`/api/classes/${encodeURIComponent(classroomId)}/members/remove`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ profileIds: targetIds })
        });

        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success) {
            return {
              success: true,
              removedCount: Number(resJson.removed_count || targetIds.length),
              removedProfileIds: Array.isArray(resJson.removed_profile_ids) ? resJson.removed_profile_ids : targetIds
            };
          } else if (resJson.error) {
            return {
              success: false,
              removedCount: 0,
              removedProfileIds: [],
              error: resJson.error
            };
          }
        }
      } catch (fetchErr) {
        console.warn('[ClassroomService] /api/classes/:id/members/remove fetch notice:', fetchErr);
      }

      // 2. Direct Supabase remove_classroom_members RPC fallback
      const { data: rpcData, error: rpcError } = await supabase.rpc('remove_classroom_members', {
        p_classroom_id: classroomId,
        p_profile_ids: targetIds
      });

      if (!rpcError && rpcData?.success) {
        return {
          success: true,
          removedCount: Number(rpcData.removed_count || targetIds.length),
          removedProfileIds: Array.isArray(rpcData.removed_profile_ids) ? rpcData.removed_profile_ids : targetIds
        };
      }

      if (rpcError && rpcError.code === '42501') {
        return {
          success: false,
          removedCount: 0,
          removedProfileIds: [],
          error: 'Access denied: Only classroom teachers and admins can remove students.'
        };
      }

      // 3. Fallback direct DELETE with .select() verification
      const { data: deletedRows, error: delError } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', classroomId)
        .in('profile_id', targetIds)
        .eq('role', 'student')
        .select('id, profile_id');

      if (delError) {
        console.error('[ClassroomService] Direct delete failed:', delError);
        return {
          success: false,
          removedCount: 0,
          removedProfileIds: [],
          error: delError.message || 'Failed to remove students from the database.'
        };
      }

      // 4. Verification query: ensure zero matching student rows exist in the DB
      const { data: remaining, error: verifyError } = await supabase
        .from('classroom_members')
        .select('id, profile_id')
        .eq('classroom_id', classroomId)
        .in('profile_id', targetIds)
        .eq('role', 'student');

      if (verifyError) {
        console.warn('[ClassroomService] Member verification check warning:', verifyError);
      } else if (remaining && remaining.length > 0) {
        return {
          success: false,
          removedCount: 0,
          removedProfileIds: [],
          error: 'Failed to permanently remove students. Please check teacher permissions.'
        };
      }

      const deletedCount = (deletedRows || []).length;
      if (deletedCount === 0 && targetIds.length > 0) {
        return {
          success: false,
          removedCount: 0,
          removedProfileIds: [],
          error: 'No matching student enrollments were found to remove.'
        };
      }

      return {
        success: true,
        removedCount: deletedCount,
        removedProfileIds: (deletedRows || []).map((r: any) => r.profile_id)
      };
    } catch (err: any) {
      console.error('[ClassroomService] removeMembers unexpected error:', err);
      return {
        success: false,
        removedCount: 0,
        removedProfileIds: [],
        error: err?.message || 'An unexpected error occurred while removing students.'
      };
    }
  }

  /**
   * Removes a member from the classroom
   */
  async removeMember(classroomId: string, memberProfileId: string): Promise<{ error?: string }> {
    const res = await this.removeMembers(classroomId, [memberProfileId]);
    if (!res.success) {
      return { error: res.error || 'Failed to remove student.' };
    }
    return {};
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

      // Check if user is classroom owner
      const { data: targetClass } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', targetClassroomId)
        .maybeSingle();

      const isOwner = targetClass?.teacher_id === userId;
      const assignedRole = isOwner ? 'teacher' : 'student';

      // Insert membership record
      const { error: joinError } = await supabase
        .from('classroom_members')
        .upsert(
          {
            classroom_id: targetClassroomId,
            profile_id: userId,
            role: assignedRole,
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
