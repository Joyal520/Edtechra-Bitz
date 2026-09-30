// ============================================================================
// EDTECHRA-BITZ: Classroom Announcements & Messages Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ClassroomMessage } from '@/types/classroom';

class ClassroomMessageService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Retrieves messages/announcements for a classroom
   */
  async getMessages(classroomId: string): Promise<ClassroomMessage[]> {
    if (!supabase || !classroomId) return [];

    try {
      // 7-day lifecycle rule for messages feed
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('classroom_messages')
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .eq('classroom_id', classroomId)
        .eq('is_deleted', false)
        .gte('created_at', sevenDaysAgo)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[ClassroomMessageService] getMessages error:', err);
      return [];
    }
  }

  /**
   * Retrieves server-authoritative active announcements with strict 7-day,
   * completion, and schedule lifecycle filtering.
   */
  async getActiveAnnouncements(classroomId: string): Promise<any[]> {
    if (!classroomId) return [];
    try {
      const { data: { session } } = await (supabase?.auth?.getSession() || { data: { session: null } });
      const token = session?.access_token;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/classes/${classroomId}/announcements`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.announcements)) {
          return json.announcements;
        }
      }
    } catch (e) {
      console.warn('[ClassroomMessageService] getActiveAnnouncements API fallback:', e);
    }

    // Fallback: 7-day filtered messages
    const msgs = await this.getMessages(classroomId);
    return msgs.map((m: any) => ({
      id: `msg-${m.id}`,
      rawId: m.id,
      type: 'announcement',
      title: m.is_pinned ? '📌 Pinned Announcement' : 'Classroom Announcement',
      description: m.message,
      createdAt: m.created_at,
      isPinned: Boolean(m.is_pinned),
      authorName: m.teacher?.full_name || 'Class Teacher',
      rawItem: m
    }));
  }

  /**
   * Posts an announcement message
   */
  async postMessage(payload: {
    classroom_id: string;
    message: string;
    is_pinned?: boolean;
  }): Promise<{ data?: ClassroomMessage; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      const { data, error } = await supabase
        .from('classroom_messages')
        .insert({
          classroom_id: payload.classroom_id,
          teacher_id: userId,
          message: payload.message.trim(),
          is_pinned: payload.is_pinned || false
        })
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[ClassroomMessageService] postMessage error:', err);
      return { error: err.message || 'Failed to post message.' };
    }
  }

  /**
   * Posts an activity notification announcement idempotently
   */
  async postActivityNotification(payload: {
    classroom_id: string;
    activity_type: 'task' | 'exam' | 'live_quiz' | 'competition';
    activity_id: string;
    title: string;
    description?: string;
  }): Promise<{ data?: ClassroomMessage; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      const typeLabel =
        payload.activity_type === 'task'
          ? 'TASK'
          : payload.activity_type === 'exam'
          ? 'EXAM'
          : payload.activity_type === 'live_quiz'
          ? 'LIVE QUIZ'
          : 'COMPETITION';

      const announcementText = `[${typeLabel}] ${payload.title}${payload.description ? ` — ${payload.description}` : ''}`;

      // Check for existing announcement
      const { data: existing } = await supabase
        .from('classroom_messages')
        .select('id')
        .eq('classroom_id', payload.classroom_id)
        .ilike('message', `%[${typeLabel}] ${payload.title}%`)
        .eq('is_deleted', false)
        .limit(1);

      if (existing && existing.length > 0) {
        return { data: existing[0] as any };
      }

      return this.postMessage({
        classroom_id: payload.classroom_id,
        message: announcementText,
        is_pinned: false
      });
    } catch (err: any) {
      console.error('[ClassroomMessageService] postActivityNotification error:', err);
      return { error: err.message || 'Failed to post activity announcement.' };
    }
  }

  /**
   * Soft-deletes a message
   */
  async deleteMessage(messageId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase
        .from('classroom_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete message.' };
    }
  }

  /**
   * Pins or unpins a message
   */
  async togglePin(messageId: string, isPinned: boolean): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { error } = await supabase
        .from('classroom_messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update message pin.' };
    }
  }
}

export const classroomMessageService = new ClassroomMessageService();
