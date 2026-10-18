// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLASSROOM MESSAGES & ANNOUNCEMENTS SERVICE
// Supports:
// - Automatic expiration (Rule A: teacher deadline; Rule B: created_at + 3 days)
// - User-specific "Mark as read" persistence across refresh & devices
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ClassroomMessage } from '@/types/classroom';

export interface ActiveAnnouncementItem {
  id: string;
  rawId: string;
  type: 'task' | 'exam' | 'live_quiz' | 'competition' | 'announcement';
  title: string;
  description: string;
  createdAt: string;
  dueDate?: string | null;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  points?: number;
  questionCount?: number;
  durationMinutes?: number;
  statusBadge?: string;
  isPinned?: boolean;
  authorName?: string;
  rawItem?: any;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const EXPIRES_META_REGEX = /^\[EXPIRES:([^\]]+)\]\n?/;

export function parseMessageExpiration(msg: any): {
  cleanMessage: string;
  expiresAtIso: string;
  expiresAtMs: number;
  hasExplicitDeadline: boolean;
} {
  const rawText = String(msg?.message || '');
  const match = rawText.match(EXPIRES_META_REGEX);
  const embeddedExpires = match ? match[1] : null;
  const cleanMessage = match ? rawText.replace(EXPIRES_META_REGEX, '') : rawText;

  const createdMs = msg?.created_at ? new Date(msg.created_at).getTime() : Date.now();
  const defaultExpiresMs = createdMs + THREE_DAYS_MS;

  const rawExpires = msg?.expires_at || embeddedExpires;
  const parsedExpiresMs = rawExpires ? new Date(rawExpires).getTime() : defaultExpiresMs;
  const finalExpiresMs = Number.isFinite(parsedExpiresMs) ? parsedExpiresMs : defaultExpiresMs;
  const hasExplicitDeadline = Boolean(
    embeddedExpires || (msg?.expires_at && Math.abs(finalExpiresMs - defaultExpiresMs) > 60000)
  );

  return {
    cleanMessage,
    expiresAtIso: new Date(finalExpiresMs).toISOString(),
    expiresAtMs: finalExpiresMs,
    hasExplicitDeadline
  };
}

class ClassroomMessageService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  private getLocalReadsKey(userId: string): string {
    return `edtechra_announcement_reads_${userId}`;
  }

  private getLocalReadIds(userId: string | null): Set<string> {
    if (!userId || typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(this.getLocalReadsKey(userId));
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
    } catch {
      return new Set();
    }
  }

  private addLocalReadId(userId: string | null, announcementId: string): void {
    if (!userId || typeof window === 'undefined') return;
    try {
      const existing = this.getLocalReadIds(userId);
      existing.add(announcementId);
      const arr = Array.from(existing).slice(-300);
      localStorage.setItem(this.getLocalReadsKey(userId), JSON.stringify(arr));
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Retrieves the set of announcement IDs marked as read by the current user
   */
  async getUserReadAnnouncementIds(classroomId: string): Promise<Set<string>> {
    const userId = await this.getUserId();
    const readIds = this.getLocalReadIds(userId);
    if (!supabase || !userId || !classroomId) return readIds;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const metaReads = sessionData.session?.user?.user_metadata?.read_announcements;
      if (Array.isArray(metaReads)) {
        metaReads.forEach((id) => readIds.add(String(id)));
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id, message_id')
        .eq('user_id', userId)
        .eq('classroom_id', classroomId);

      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.announcement_id) readIds.add(String(row.announcement_id));
          if (row.message_id) {
            readIds.add(String(row.message_id));
            readIds.add(`msg-${row.message_id}`);
          }
        });
      }
    } catch {
      // Ignore if table not yet migrated on remote DB
    }

    return readIds;
  }

  /**
   * Marks an announcement as read for the current user ONLY.
   * Persists across page refreshes and across devices without deleting globally.
   */
  async markAnnouncementAsRead(
    classroomId: string,
    announcementId: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanId = String(announcementId || '').trim();
    if (!classroomId || !cleanId) {
      return { success: false, error: 'Invalid announcement ID' };
    }

    const userId = await this.getUserId();
    if (!userId) {
      return { success: false, error: 'Authentication required' };
    }

    // 1. Immediate local persistence for instant UX
    this.addLocalReadId(userId, cleanId);
    if (cleanId.startsWith('msg-')) {
      this.addLocalReadId(userId, cleanId.slice(4));
    }

    // 2. Server-side persistence (announcement_reads table + user_metadata fallback)
    try {
      const { data: sessionData } = (await supabase?.auth.getSession()) || { data: { session: null } };
      const token = sessionData.session?.access_token;
      if (token) {
        const res = await fetch(`/api/classes/${classroomId}/announcements/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ announcementId: cleanId })
        });
        if (res.ok) {
          return { success: true };
        }
      }
    } catch {
      // Continue to direct Supabase fallback
    }

    // 3. Direct Supabase fallback if backend endpoint is offline
    if (supabase) {
      try {
        const rawUuid = cleanId.startsWith('msg-') ? cleanId.slice(4) : null;
        const isUuid = rawUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUuid);

        await supabase
          .from('announcement_reads')
          .upsert(
            {
              user_id: userId,
              classroom_id: classroomId,
              announcement_id: cleanId,
              message_id: isUuid ? rawUuid : null,
              read_at: new Date().toISOString()
            },
            { onConflict: 'user_id,announcement_id' }
          );
      } catch {
        // Fallback if announcement_reads table is not yet migrated
      }
    }

    return { success: true };
  }

  /**
   * Fetches authoritative active announcements from backend lifecycle API
   * Automatically triggers server-side expired announcement cleanup and filters out read items
   */
  async getActiveAnnouncements(classroomId: string): Promise<{
    announcements: ActiveAnnouncementItem[];
    serverTime?: string;
    fromServer: boolean;
  }> {
    const userId = await this.getUserId();
    const localReads = this.getLocalReadIds(userId);

    if (!supabase || !classroomId) {
      return { announcements: [], fromServer: false };
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return { announcements: [], fromServer: false };

      const res = await fetch(`/api/classes/${classroomId}/announcements?_t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        return { announcements: [], fromServer: false };
      }

      const json = await res.json();
      if (json && json.success && Array.isArray(json.announcements)) {
        const filtered = (json.announcements as ActiveAnnouncementItem[]).filter(
          (item) => !localReads.has(item.id) && !(item.rawId && localReads.has(item.rawId))
        );
        return {
          announcements: filtered,
          serverTime: json.server_time,
          fromServer: true
        };
      }
    } catch (err) {
      console.warn('[ClassroomMessageService] getActiveAnnouncements fallback to client:', err);
    }

    return { announcements: [], fromServer: false };
  }

  /**
   * Retrieves active announcements/messages for a classroom (pinned first, then newest)
   * Automatically cleans up expired announcements (deadline passed or > 3 days old)
   */
  async getMessages(classroomId: string): Promise<ClassroomMessage[]> {
    if (!supabase || !classroomId) return [];

    try {
      // Trigger database-level cleanup RPC if available
      try {
        await supabase.rpc('cleanup_expired_announcements');
      } catch {}

      const { data, error } = await supabase
        .from('classroom_messages')
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .eq('classroom_id', classroomId)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const nowMs = Date.now();
      const activeMessages: ClassroomMessage[] = [];
      const expiredIds: string[] = [];

      for (const row of data || []) {
        const parsed = parseMessageExpiration(row);
        if (parsed.expiresAtMs <= nowMs) {
          expiredIds.push(row.id);
        } else {
          activeMessages.push({
            ...row,
            message: parsed.cleanMessage,
            expires_at: parsed.expiresAtIso
          });
        }
      }

      // Delete any expired announcements found during query
      if (expiredIds.length > 0) {
        supabase
          .from('classroom_messages')
          .delete()
          .in('id', expiredIds)
          .then(() => {});
      }

      return activeMessages;
    } catch (err) {
      console.error('[ClassroomMessageService] getMessages error:', err);
      return [];
    }
  }

  /**
   * Posts a new teacher announcement to the classroom stream with expiration rule:
   * - Rule A (has deadline): expires_at = deadline
   * - Rule B (no deadline): expires_at = created_at + 3 days
   */
  async postMessage(payload: {
    classroom_id: string;
    message: string;
    is_pinned?: boolean;
    deadline?: string | null;
  }): Promise<{ data?: ClassroomMessage; error?: string }> {
    if (!supabase) return { error: 'Database is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    const cleanMessage = (payload.message || '').trim();
    if (!cleanMessage) return { error: 'Announcement text cannot be empty.' };

    const nowMs = Date.now();
    let expiresAtIso = new Date(nowMs + THREE_DAYS_MS).toISOString();

    if (payload.deadline) {
      const deadlineMs = new Date(payload.deadline).getTime();
      if (!Number.isFinite(deadlineMs)) {
        return { error: 'Please select a valid deadline date and time.' };
      }
      if (deadlineMs <= nowMs) {
        return { error: 'Announcement deadline must be in the future.' };
      }
      expiresAtIso = new Date(deadlineMs).toISOString();
    }

    // 1. Try authoritative backend endpoint first
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const res = await fetch(`/api/classes/${payload.classroom_id}/announcements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            message: cleanMessage,
            isPinned: Boolean(payload.is_pinned),
            deadline: payload.deadline ? expiresAtIso : null
          })
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.data) {
          return { data: json.data };
        }
        if (!res.ok && json.error && res.status === 400) {
          return { error: json.error };
        }
      }
    } catch {
      // Fallback to direct Supabase insert below
    }

    // 2. Direct Supabase insert with fallback if expires_at column not yet migrated
    try {
      const attempt = await supabase
        .from('classroom_messages')
        .insert({
          classroom_id: payload.classroom_id,
          teacher_id: userId,
          message: cleanMessage,
          is_pinned: payload.is_pinned || false,
          is_deleted: false,
          expires_at: expiresAtIso
        })
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .single();

      if (!attempt.error && attempt.data) {
        return {
          data: {
            ...attempt.data,
            message: cleanMessage,
            expires_at: expiresAtIso
          }
        };
      }

      // Fallback: embed [EXPIRES:...] tag in message column
      const encodedText = `[EXPIRES:${expiresAtIso}]\n${cleanMessage}`;
      const { data, error } = await supabase
        .from('classroom_messages')
        .insert({
          classroom_id: payload.classroom_id,
          teacher_id: userId,
          message: encodedText,
          is_pinned: payload.is_pinned || false,
          is_deleted: false
        })
        .select(`
          *,
          teacher:profiles!teacher_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return {
        data: {
          ...data,
          message: cleanMessage,
          expires_at: expiresAtIso
        }
      };
    } catch (err: any) {
      return { error: err.message || 'Failed to post announcement' };
    }
  }

  /**
   * Toggles pinned status of an announcement
   */
  async togglePin(messageId: string, isPinned: boolean): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Database is not configured' };

    try {
      const { error } = await supabase
        .from('classroom_messages')
        .update({
          is_pinned: isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update announcement' };
    }
  }

  /**
   * Soft deletes an announcement
   */
  async deleteMessage(messageId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Database is not configured' };

    try {
      const { error } = await supabase
        .from('classroom_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete announcement' };
    }
  }
}

export const classroomMessageService = new ClassroomMessageService();
