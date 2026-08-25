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
      return data || [];
    } catch (err) {
      console.error('[ClassroomMessageService] getMessages error:', err);
      return [];
    }
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
