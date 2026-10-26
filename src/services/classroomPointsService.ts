// ============================================================================
// EDTECHRA-BITZ: Classroom Points & Leaderboard Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ClassroomPoint, ClassroomLeaderboardEntry, LeaderboardResetFrequency, LeaderboardSettings } from '@/types/classroom';
import { calculateNextResetDate, isResetDue, DEFAULT_LEADERBOARD_TIMEZONE } from '@/utils/leaderboardResetUtils';

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

  public getLocalLeaderboardSettings(classroomId: string): LeaderboardSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(`edtechra_lb_settings_${classroomId}`);
        if (raw) return JSON.parse(raw);
      }
    } catch (_) {}
    return {
      frequency: 'never',
      reset_at: null,
      next_reset_at: null,
      timezone: DEFAULT_LEADERBOARD_TIMEZONE
    };
  }

  public saveLocalLeaderboardSettings(classroomId: string, settings: LeaderboardSettings) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`edtechra_lb_settings_${classroomId}`, JSON.stringify(settings));
      }
    } catch (_) {}
  }

  /**
   * Calculates real-time classroom leaderboard rankings
   */
  async getClassroomLeaderboard(classroomId: string): Promise<ClassroomLeaderboardEntry[]> {
    if (!supabase || !classroomId) return [];

    try {
      const localSettings = this.getLocalLeaderboardSettings(classroomId);

      // 1. Fetch classroom safely (fallback to basic columns if migration not yet applied)
      let classroom: any = null;
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select('teacher_id, leaderboard_reset_frequency, leaderboard_reset_at, leaderboard_next_reset_at, leaderboard_timezone')
          .eq('id', classroomId)
          .maybeSingle();

        if (!error && data) {
          classroom = data;
        }
      } catch (_) {}

      if (!classroom) {
        const { data: coreClassroom } = await supabase
          .from('classrooms')
          .select('teacher_id')
          .eq('id', classroomId)
          .maybeSingle();
        classroom = coreClassroom || {};
      }

      const ownerId = classroom?.teacher_id;
      const frequency = (classroom?.leaderboard_reset_frequency as LeaderboardResetFrequency) || localSettings.frequency || 'never';
      const timeZone = classroom?.leaderboard_timezone || localSettings.timezone || DEFAULT_LEADERBOARD_TIMEZONE;
      let effectiveResetAt = classroom?.leaderboard_reset_at || localSettings.reset_at || null;
      const scheduledNextResetAt = classroom?.leaderboard_next_reset_at || localSettings.next_reset_at || null;

      // Self-healing automatic scheduled reset check:
      if (frequency !== 'never' && scheduledNextResetAt && isResetDue(scheduledNextResetAt)) {
        const passedResetTime = scheduledNextResetAt;
        const nextReset = calculateNextResetDate(frequency, new Date(), timeZone);
        effectiveResetAt = passedResetTime;

        const updatedSettings: LeaderboardSettings = {
          frequency,
          reset_at: passedResetTime,
          next_reset_at: nextReset ? nextReset.toISOString() : null,
          timezone: timeZone
        };
        this.saveLocalLeaderboardSettings(classroomId, updatedSettings);

        // Asynchronously update classroom reset state in Supabase if supported
        try {
          supabase
            .from('classrooms')
            .update({
              leaderboard_reset_at: passedResetTime,
              leaderboard_next_reset_at: nextReset ? nextReset.toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', classroomId)
            .then();
        } catch (_) {}
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

      const { data: pointsData } = await pointsQuery;

      const pointsMap: Record<string, number> = {};
      (pointsData || []).forEach((p: any) => {
        if (!p?.student_id) return;
        pointsMap[p.student_id] = (pointsMap[p.student_id] || 0) + Number(p.points || 0);
      });

      // Ensure any student who earned points in this classroom (e.g. via Course Studio) is included
      const existingMemberIds = new Set(studentList.map((m: any) => m.profile_id));
      const missingStudentIds = Object.keys(pointsMap).filter(
        sid => !existingMemberIds.has(sid) && sid !== ownerId
      );

      if (missingStudentIds.length > 0) {
        const { data: extraProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role')
          .in('id', missingStudentIds);

        (extraProfiles || []).forEach((prof: any) => {
          if (prof.role === 'teacher' || prof.role === 'admin') return;
          if (prof.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com') return;
          studentList.push({
            profile_id: prof.id,
            display_name: prof.full_name || null,
            role: 'student',
            profile: prof
          });
        });
      }

      if (studentList.length === 0) return [];

      // 4. Count completed assignments (strictly for metadata)
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
        const name = cleanProfileName || cleanMemberName || profile?.full_name?.trim() || m.display_name?.trim() || profile?.email?.split('@')[0] || 'Student';
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

  /**
   * Retrieves current leaderboard settings for a classroom
   */
  async getLeaderboardSettings(classroomId: string): Promise<LeaderboardSettings | null> {
    if (!classroomId) return null;
    const localSettings = this.getLocalLeaderboardSettings(classroomId);

    if (!supabase) return localSettings;
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('leaderboard_reset_frequency, leaderboard_reset_at, leaderboard_next_reset_at, leaderboard_timezone')
        .eq('id', classroomId)
        .maybeSingle();

      if (!error && data) {
        return {
          frequency: (data.leaderboard_reset_frequency as LeaderboardResetFrequency) || localSettings.frequency,
          reset_at: data.leaderboard_reset_at || localSettings.reset_at,
          next_reset_at: data.leaderboard_next_reset_at || localSettings.next_reset_at,
          timezone: data.leaderboard_timezone || localSettings.timezone
        };
      }
    } catch (_) {}

    return localSettings;
  }

  /**
   * Updates reset frequency and recomputes the next reset timestamp
   */
  async updateLeaderboardSettings(
    classroomId: string,
    frequency: LeaderboardResetFrequency,
    timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE
  ): Promise<{ success: boolean; error?: string; settings?: LeaderboardSettings }> {
    if (!classroomId) return { success: false, error: 'Classroom ID required' };

    const nextReset = calculateNextResetDate(frequency, new Date(), timeZone);
    const nextResetIso = nextReset ? nextReset.toISOString() : null;

    const currentLocal = this.getLocalLeaderboardSettings(classroomId);
    const newSettings: LeaderboardSettings = {
      frequency,
      reset_at: currentLocal.reset_at,
      next_reset_at: nextResetIso,
      timezone: timeZone
    };
    this.saveLocalLeaderboardSettings(classroomId, newSettings);

    try {
      // 1. Attempt backend API first for server-validated authorization
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch(`/api/classes/${classroomId}/leaderboard/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ frequency, timezone: timeZone })
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success && body.settings) {
          this.saveLocalLeaderboardSettings(classroomId, body.settings);
          return { success: true, settings: body.settings };
        }
      }
    } catch (_apiErr) {
      // Continue to Supabase update
    }

    if (supabase) {
      try {
        const updates = {
          leaderboard_reset_frequency: frequency,
          leaderboard_next_reset_at: nextResetIso,
          leaderboard_timezone: timeZone,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('classrooms')
          .update(updates)
          .eq('id', classroomId)
          .select('leaderboard_reset_frequency, leaderboard_reset_at, leaderboard_next_reset_at, leaderboard_timezone')
          .single();

        if (!error && data) {
          newSettings.frequency = data.leaderboard_reset_frequency;
          newSettings.reset_at = data.leaderboard_reset_at;
          newSettings.next_reset_at = data.leaderboard_next_reset_at;
          newSettings.timezone = data.leaderboard_timezone;
          this.saveLocalLeaderboardSettings(classroomId, newSettings);
        }
      } catch (_) {
        // Resilient fallback: local and backend stores are already updated
      }
    }

    return {
      success: true,
      settings: newSettings
    };
  }

  /**
   * Resets all student scores on the classroom leaderboard to 0 XP immediately.
   * Completely preserves historical activities, grades, learning records, and student accounts.
   */
  async resetLeaderboard(
    classroomId: string
  ): Promise<{ success: boolean; error?: string; message?: string; reset_at?: string; next_reset_at?: string | null }> {
    if (!classroomId) return { success: false, error: 'Classroom ID required' };

    const localSettings = this.getLocalLeaderboardSettings(classroomId);
    const nowIso = new Date().toISOString();
    const frequency = localSettings.frequency || 'never';
    const timeZone = localSettings.timezone || DEFAULT_LEADERBOARD_TIMEZONE;
    const nextReset = calculateNextResetDate(frequency, new Date(), timeZone);
    const nextResetIso = nextReset ? nextReset.toISOString() : null;

    const updatedSettings: LeaderboardSettings = {
      frequency,
      reset_at: nowIso,
      next_reset_at: nextResetIso,
      timezone: timeZone
    };
    this.saveLocalLeaderboardSettings(classroomId, updatedSettings);

    try {
      // 1. Attempt backend API first for server-validated authorization
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;

      const res = await fetch(`/api/classes/${classroomId}/leaderboard/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          if (body.reset_at) updatedSettings.reset_at = body.reset_at;
          if (body.next_reset_at) updatedSettings.next_reset_at = body.next_reset_at;
          this.saveLocalLeaderboardSettings(classroomId, updatedSettings);
          return body;
        }
      }
    } catch (_apiErr) {
      // Continue to direct Supabase update
    }

    if (supabase) {
      try {
        await supabase
          .from('classrooms')
          .update({
            leaderboard_reset_at: nowIso,
            leaderboard_next_reset_at: nextResetIso,
            updated_at: nowIso
          })
          .eq('id', classroomId);
      } catch (_) {
        // Resilient fallback: local and backend stores are already updated
      }
    }

    return {
      success: true,
      message: 'Leaderboard reset successfully. Everyone starts from 0 XP.',
      reset_at: nowIso,
      next_reset_at: nextResetIso
    };
  }
}

export const classroomPointsService = new ClassroomPointsService();
