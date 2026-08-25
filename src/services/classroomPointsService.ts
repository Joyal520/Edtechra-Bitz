// ============================================================================
// EDTECHRA-BITZ: Classroom Points & Leaderboard Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ClassroomPoint, ClassroomLeaderboardEntry } from '@/types/classroom';

class ClassroomPointsService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Awards points to a student in a classroom
   */
  async awardPoints(payload: {
    classroom_id: string;
    student_id: string;
    points: number;
    reason: string;
    source_type?: ClassroomPoint['source_type'];
    source_id?: string | null;
  }): Promise<{ data?: ClassroomPoint; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();

    try {
      const { data, error } = await supabase
        .from('classroom_points')
        .insert({
          classroom_id: payload.classroom_id,
          student_id: payload.student_id,
          points: payload.points,
          reason: payload.reason.trim(),
          source_type: payload.source_type || 'assignment',
          source_id: payload.source_id || null,
          awarded_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[ClassroomPointsService] awardPoints error:', err);
      return { error: err.message || 'Failed to award points.' };
    }
  }

  /**
   * Retrieves points history for a student in a classroom
   */
  async getStudentPointsHistory(classroomId: string, studentId: string): Promise<ClassroomPoint[]> {
    if (!supabase || !classroomId || !studentId) return [];

    try {
      const { data, error } = await supabase
        .from('classroom_points')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[ClassroomPointsService] getStudentPointsHistory error:', err);
      return [];
    }
  }

  /**
   * Calculates real-time classroom leaderboard rankings
   */
  async getClassroomLeaderboard(classroomId: string): Promise<ClassroomLeaderboardEntry[]> {
    if (!supabase || !classroomId) return [];

    try {
      // 1. Fetch active members
      const { data: members, error: memError } = await supabase
        .from('classroom_members')
        .select(`
          profile_id,
          display_name,
          profile:profiles!profile_id (id, full_name, email, avatar_url)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .eq('role', 'student');

      if (memError) throw memError;

      const studentList = members || [];
      if (studentList.length === 0) return [];

      // 2. Aggregate points
      const { data: pointsData } = await supabase
        .from('classroom_points')
        .select('student_id, points')
        .eq('classroom_id', classroomId);

      const pointsMap: Record<string, number> = {};
      (pointsData || []).forEach((p: any) => {
        pointsMap[p.student_id] = (pointsMap[p.student_id] || 0) + Number(p.points || 0);
      });

      // 3. Count completed assignments
      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .in('status', ['submitted', 'graded']);

      const subCountMap: Record<string, number> = {};
      (submissionsData || []).forEach((s: any) => {
        subCountMap[s.student_id] = (subCountMap[s.student_id] || 0) + 1;
      });

      // 4. Build leaderboard and sort by points descending
      const entries: ClassroomLeaderboardEntry[] = studentList.map((m: any) => {
        const studentId = m.profile_id;
        const profile = m.profile;
        const name = m.display_name || profile?.full_name || profile?.email?.split('@')[0] || 'Student';
        return {
          student_id: studentId,
          name,
          avatar_url: profile?.avatar_url || null,
          points: pointsMap[studentId] || 0,
          rank: 0,
          assignments_completed: subCountMap[studentId] || 0
        };
      });

      entries.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      return entries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
    } catch (err) {
      console.error('[ClassroomPointsService] getClassroomLeaderboard error:', err);
      return [];
    }
  }
}

export const classroomPointsService = new ClassroomPointsService();
