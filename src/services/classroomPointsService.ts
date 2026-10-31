// ============================================================================
// EDTECHRA-BITZ: Classroom Points & Leaderboard Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ClassroomPoint, ClassroomLeaderboardEntry, LeaderboardResetFrequency, LeaderboardSettings } from '@/types/classroom';
import { DEFAULT_LEADERBOARD_TIMEZONE, sanitizeLeaderboardStudentName } from '@/utils/leaderboardResetUtils';

type ResetLeaderboardResponse = {
  success: boolean;
  error?: string;
  message?: string;
  reset_at?: string;
  next_reset_at?: string | null;
  frequency?: LeaderboardResetFrequency;
  timezone?: string;
};

type UpdateLeaderboardSettingsResponse = {
  success: boolean;
  error?: string;
  settings?: LeaderboardSettings;
};

class ClassroomPointsService {
  private resetInFlight = new Map<string, Promise<ResetLeaderboardResponse>>();
  private settingsInFlight = new Map<string, Promise<UpdateLeaderboardSettingsResponse>>();
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
      // Idempotency check: if source_id is provided, check if points already awarded
      if (payload.source_id && payload.source_type) {
        const { data: existing } = await supabase
          .from('classroom_points')
          .select('*')
          .eq('classroom_id', payload.classroom_id)
          .eq('student_id', payload.student_id)
          .eq('source_type', payload.source_type)
          .eq('source_id', payload.source_id)
          .maybeSingle();

        if (existing) {
          return { data: existing };
        }
      }

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

  private clearLegacyLocalSettings(classroomId: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`edtechra_lb_settings_${classroomId}`);
      }
    } catch (_) {
      // Ignore storage access restrictions
    }
  }

  /**
   * Calculates real-time classroom leaderboard rankings strictly from the database source of truth.
   */
  async getClassroomLeaderboard(
    classroomId: string,
    options?: { throwOnError?: boolean }
  ): Promise<ClassroomLeaderboardEntry[]> {
    if (!supabase || !classroomId) return [];

    this.clearLegacyLocalSettings(classroomId);

    try {
      // 1. Fetch authoritative classroom ownership & leaderboard period state from database
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('teacher_id, leaderboard_reset_frequency, leaderboard_reset_at, leaderboard_next_reset_at, leaderboard_timezone')
        .eq('id', classroomId)
        .maybeSingle();

      if (classroomError) throw classroomError;
      if (!classroom) return [];

      const ownerId = classroom.teacher_id;
      const frequency = (classroom.leaderboard_reset_frequency as LeaderboardResetFrequency) || 'never';
      let effectiveResetAt: string | null = classroom.leaderboard_reset_at || null;
      const scheduledNextResetAt: string | null = classroom.leaderboard_next_reset_at || null;

      // Authoritative scheduled auto-reset check (handles serverless & midnight rollover safely via DB RPC):
      if (frequency !== 'never' && scheduledNextResetAt) {
        const scheduledMs = new Date(scheduledNextResetAt).getTime();
        // 60s buffer covers client/server clock skew; Postgres RPC verifies exact clock_timestamp() with row locking
        if (!isNaN(scheduledMs) && scheduledMs <= Date.now() + 60_000) {
          const { data: syncRes, error: syncErr } = await supabase.rpc(
            'sync_classroom_leaderboard_schedule',
            { p_classroom_id: classroomId }
          );
          if (!syncErr && syncRes?.success) {
            effectiveResetAt = syncRes.reset_at || effectiveResetAt;
          }
        }
      }

      // 2. Fetch active members
      const { data: members, error: memError } = await supabase
        .from('classroom_members')
        .select(`
          profile_id,
          display_name,
          role,
          profile:profiles!profile_id (id, full_name, email, avatar_url, role)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active');

      if (memError) throw memError;

      // Filter out any teacher, co-teacher, classroom owner, or global teacher/admin
      const studentList = (members || []).filter((m: any) => {
        if (ownerId && m.profile_id === ownerId) return false;
        if (m.role === 'teacher' || m.role === 'co-teacher') return false;
        if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return false;
        if (m.profile?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com') return false;
        return true;
      });

      // 3. Aggregate points by authenticated student_id (strictly for the current period)
      let pointsQuery = supabase
        .from('classroom_points')
        .select('student_id, points, created_at')
        .eq('classroom_id', classroomId);

      if (effectiveResetAt) {
        pointsQuery = pointsQuery.gte('created_at', effectiveResetAt);
      }

      const { data: pointsData, error: pointsError } = await pointsQuery;
      if (pointsError) throw pointsError;

      const pointsMap: Record<string, number> = {};
      (pointsData || []).forEach((p: any) => {
        if (!p?.student_id) return;
        pointsMap[p.student_id] = (pointsMap[p.student_id] || 0) + Number(p.points || 0);
      });

      // Only active enrolled classroom members should appear on the leaderboard.
      // Historical learning/points records are preserved, but removed non-members are excluded.
      if (studentList.length === 0) return [];

      // 4. Count completed assignments (strictly for metadata; historical submissions preserved)
      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('student_id')
        .eq('classroom_id', classroomId)
        .in('status', ['submitted', 'graded']);

      const subCountMap: Record<string, number> = {};
      (submissionsData || []).forEach((s: any) => {
        subCountMap[s.student_id] = (subCountMap[s.student_id] || 0) + 1;
      });

      // 5. Build leaderboard and sort by points descending (keyed strictly by permanent student_id)
      const entries: ClassroomLeaderboardEntry[] = studentList.map((m: any) => {
        const studentId = m.profile_id;
        const profile = m.profile;
        const cleanProfileName = profile?.full_name && !profile.full_name.includes('@')
          ? profile.full_name.trim()
          : '';
        const cleanMemberName = m.display_name && !m.display_name.includes('@')
          ? m.display_name.trim()
          : '';
        const rawCandidateName =
          cleanProfileName ||
          cleanMemberName ||
          profile?.full_name?.trim() ||
          m.display_name?.trim() ||
          profile?.email?.split('@')[0] ||
          'Student';
        const name = sanitizeLeaderboardStudentName(rawCandidateName);

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
      if (options?.throwOnError) {
        throw err;
      }
      return [];
    }
  }

  /**
   * Retrieves current leaderboard settings for a classroom directly from the database
   */
  async getLeaderboardSettings(classroomId: string): Promise<LeaderboardSettings | null> {
    if (!classroomId || !supabase) return null;
    this.clearLegacyLocalSettings(classroomId);

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('leaderboard_reset_frequency, leaderboard_reset_at, leaderboard_next_reset_at, leaderboard_timezone')
        .eq('id', classroomId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        frequency: (data.leaderboard_reset_frequency as LeaderboardResetFrequency) || 'never',
        reset_at: data.leaderboard_reset_at || null,
        next_reset_at: data.leaderboard_next_reset_at || null,
        timezone: data.leaderboard_timezone || DEFAULT_LEADERBOARD_TIMEZONE
      };
    } catch (err) {
      console.error('[ClassroomPointsService] getLeaderboardSettings error:', err);
      return null;
    }
  }

  /**
   * Updates reset frequency and recomputes the next reset timestamp on the backend/database.
   */
  async updateLeaderboardSettings(
    classroomId: string,
    frequency: LeaderboardResetFrequency,
    timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE
  ): Promise<UpdateLeaderboardSettingsResponse> {
    if (!classroomId) return { success: false, error: 'Classroom ID required.' };
    if (!supabase) return { success: false, error: 'Database service is not configured.' };

    const existing = this.settingsInFlight.get(classroomId);
    if (existing) return existing;

    const requestPromise = (async (): Promise<UpdateLeaderboardSettingsResponse> => {
      try {
        this.clearLegacyLocalSettings(classroomId);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          return { success: false, error: 'Authentication required. Please sign in again.' };
        }

        const res = await fetch(`/api/classes/${encodeURIComponent(classroomId)}/leaderboard/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ frequency, timezone: timeZone })
        });

        let body: any = null;
        try {
          body = await res.json();
        } catch (_) {
          body = null;
        }

        if (!res.ok || !body?.success || !body?.settings) {
          const errMsg = body?.error || 'Failed to update leaderboard reset frequency. Please try again.';
          console.error('[ClassroomPointsService] updateLeaderboardSettings failed:', {
            classroomId,
            status: res.status,
            error: errMsg
          });
          return { success: false, error: errMsg };
        }

        return {
          success: true,
          settings: body.settings
        };
      } catch (err: any) {
        console.error('[ClassroomPointsService] updateLeaderboardSettings network error:', {
          classroomId,
          message: err?.message
        });
        return {
          success: false,
          error: 'Failed to update leaderboard reset frequency. Please check your connection and try again.'
        };
      }
    })();

    this.settingsInFlight.set(classroomId, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (this.settingsInFlight.get(classroomId) === requestPromise) {
        this.settingsInFlight.delete(classroomId);
      }
    }
  }

  /**
   * Resets all student scores on the classroom leaderboard to 0 XP atomically on the backend/database.
   * Completely preserves historical activities, grades, learning records, and student accounts.
   */
  async resetLeaderboard(classroomId: string): Promise<ResetLeaderboardResponse> {
    if (!classroomId) return { success: false, error: 'Classroom ID required.' };
    if (!supabase) return { success: false, error: 'Database service is not configured.' };

    const existing = this.resetInFlight.get(classroomId);
    if (existing) return existing;

    const requestPromise = (async (): Promise<ResetLeaderboardResponse> => {
      try {
        this.clearLegacyLocalSettings(classroomId);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          return {
            success: false,
            error: 'Authentication required. No student learning data was changed.'
          };
        }

        const res = await fetch(`/api/classes/${encodeURIComponent(classroomId)}/leaderboard/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        let body: any = null;
        try {
          body = await res.json();
        } catch (_) {
          body = null;
        }

        if (!res.ok || !body?.success || !body?.reset_at) {
          const errMsg =
            body?.error ||
            'Leaderboard reset failed. No student learning data was changed. Please try again.';
          console.error('[ClassroomPointsService] resetLeaderboard failed:', {
            classroomId,
            status: res.status,
            error: errMsg
          });
          return {
            success: false,
            error: errMsg
          };
        }

        return {
          success: true,
          message: body.message || 'Leaderboard reset successfully. Student learning records were preserved.',
          reset_at: body.reset_at,
          next_reset_at: body.next_reset_at ?? null,
          frequency: body.frequency,
          timezone: body.timezone
        };
      } catch (err: any) {
        console.error('[ClassroomPointsService] resetLeaderboard network error:', {
          classroomId,
          message: err?.message
        });
        return {
          success: false,
          error: 'Leaderboard reset failed. No student learning data was changed. Please try again.'
        };
      }
    })();

    this.resetInFlight.set(classroomId, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (this.resetInFlight.get(classroomId) === requestPromise) {
        this.resetInFlight.delete(classroomId);
      }
    }
  }
}

export const classroomPointsService = new ClassroomPointsService();
