// ============================================================================
// EDTECHRA LIBRARY: Client-Side API & Realtime Service
// Handles Library Resources CRUD, Cloudflare R2 direct uploads,
// and Supabase Realtime Remote-Control Presentation Sessions.
// ============================================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  LibraryResource,
  LibraryFilterState,
  PresentationSession,
  LibraryFileType,
  getNormalizedFileType
} from '@/types/library';

class LibraryService {
  private async getAuthToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Generates a 6-digit random numeric PIN for mobile presentation control
   */
  private generateNumericCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // ==========================================================================
  // 1. RESOURCE RETRIEVAL & FILTERING
  // ==========================================================================

  async getResources(filters?: Partial<LibraryFilterState>, isAdmin: boolean = false): Promise<LibraryResource[]> {
    if (!supabase) return [];

    try {
      let query = supabase
        .from('library_resources')
        .select(`
          *,
          uploader:profiles!uploaded_by (id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Non-admins only see published resources
      if (!isAdmin) {
        query = query.eq('published', true);
      } else if (filters?.published && filters.published !== 'all') {
        query = query.eq('published', filters.published === 'published');
      }

      if (filters?.subject && filters.subject !== 'all' && filters.subject !== 'All') {
        query = query.eq('subject', filters.subject);
      }

      if (filters?.category && filters.category !== 'all' && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }

      if (filters?.grade_level && filters.grade_level !== 'all' && filters.grade_level !== 'All') {
        query = query.eq('grade_level', filters.grade_level);
      }

      if (filters?.file_type && filters.file_type !== 'all') {
        if (filters.file_type === 'web_blog') {
          query = query.or('file_type.eq.web_blog,category.eq.Web / Blogs,file_url.ilike.%.html,file_key.ilike.%.html');
        } else if (filters.file_type === 'pdf') {
          query = query.eq('file_type', 'pdf').not('category', 'eq', 'Web / Blogs').not('file_url', 'ilike', '%.html');
        } else {
          query = query.eq('file_type', filters.file_type);
        }
      }

      if (filters?.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`title.ilike.${term},description.ilike.${term},author.ilike.${term},subject.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[LibraryService] getResources error:', error);
        return [];
      }

      const rawList = (data || []) as LibraryResource[];
      return rawList.map(res => ({
        ...res,
        file_type: getNormalizedFileType(res)
      }));
    } catch (err) {
      console.error('[LibraryService] getResources exception:', err);
      return [];
    }
  }

  async getResourceById(id: string): Promise<LibraryResource | null> {
    if (!supabase || !id) return null;

    try {
      const { data, error } = await supabase
        .from('library_resources')
        .select(`
          *,
          uploader:profiles!uploaded_by (id, full_name, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      const res = data as LibraryResource;
      return {
        ...res,
        file_type: getNormalizedFileType(res)
      };
    } catch (err) {
      console.error('[LibraryService] getResourceById error:', err);
      return null;
    }
  }

  // ==========================================================================
  // 2. RESOURCE MANAGEMENT (ADMIN ONLY)
  // ==========================================================================

  async createResource(payload: {
    title: string;
    description?: string;
    subject: string;
    category: string;
    grade_level: string;
    file_type: LibraryFileType;
    file_url: string;
    file_key?: string | null;
    file_size?: number;
    cover_image_url?: string | null;
    cover_image_key?: string | null;
    author?: string | null;
    published?: boolean;
    total_slides?: number;
  }): Promise<{ data?: LibraryResource; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const userId = await this.getUserId();

    try {
      let insertData: any = {
        title: payload.title.trim(),
        description: (payload.description || '').trim(),
        subject: payload.subject.trim() || 'General',
        category: payload.category.trim() || 'General',
        grade_level: payload.grade_level.trim() || 'All Grades',
        file_type: payload.file_type,
        file_url: payload.file_url,
        file_key: payload.file_key || null,
        file_size: payload.file_size || 0,
        cover_image_url: payload.cover_image_url || null,
        cover_image_key: payload.cover_image_key || null,
        author: payload.author?.trim() || null,
        published: payload.published !== false,
        total_slides: payload.total_slides || 0,
        uploaded_by: userId
      };

      let { data, error } = await supabase
        .from('library_resources')
        .insert(insertData)
        .select(`
          *,
          uploader:profiles!uploaded_by (id, full_name, email)
        `)
        .single();

      // Graceful fallback if database check constraint does not yet permit 'web_blog'
      if (error && (error.code === '23514' || error.message?.includes('check constraint')) && payload.file_type === 'web_blog') {
        console.warn('[LibraryService] Falling back to compatible file_type: pdf with category: Web / Blogs');
        insertData = {
          ...insertData,
          file_type: 'pdf',
          category: 'Web / Blogs'
        };
        const fbResult = await supabase
          .from('library_resources')
          .insert(insertData)
          .select(`
            *,
            uploader:profiles!uploaded_by (id, full_name, email)
          `)
          .single();
        data = fbResult.data;
        error = fbResult.error;
      }

      if (error) {
        return { error: error.message };
      }

      const res = data as LibraryResource;
      return {
        data: {
          ...res,
          file_type: getNormalizedFileType(res)
        }
      };
    } catch (err: any) {
      return { error: err.message || 'Failed to create library resource.' };
    }
  }

  async updateResource(
    id: string,
    payload: Partial<LibraryResource>
  ): Promise<{ data?: LibraryResource; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      const updateData: Record<string, any> = {
        ...payload,
        updated_at: new Date().toISOString()
      };
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.uploader;

      const { data, error } = await supabase
        .from('library_resources')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          uploader:profiles!uploaded_by (id, full_name, email)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data: data as LibraryResource };
    } catch (err: any) {
      return { error: err.message || 'Failed to update library resource.' };
    }
  }

  async deleteResource(id: string, fileKey?: string | null, coverKey?: string | null): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      // 1. Delete from Supabase
      const { error } = await supabase
        .from('library_resources')
        .delete()
        .eq('id', id);

      if (error) {
        return { error: error.message };
      }

      // 2. Clean up R2 binaries if keys provided
      const token = await this.getAuthToken();
      const keysToDelete = [fileKey, coverKey].filter(Boolean) as string[];
      if (keysToDelete.length > 0 && token) {
        try {
          await fetch('/api/library/delete-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ objectKeys: keysToDelete })
          });
        } catch (cleanupErr) {
          console.warn('[LibraryService] R2 file cleanup notice:', cleanupErr);
        }
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete library resource.' };
    }
  }

  // ==========================================================================
  // 3. CLOUDFLARE R2 UPLOAD
  // ==========================================================================

  async uploadFileToR2(
    file: File,
    isCover: boolean = false
  ): Promise<{ publicUrl: string; objectKey: string }> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required for uploading.');
    }

    // 1. Request presigned upload URL from backend
    const presignRes = await fetch('/api/library/presign-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || (isCover ? 'image/jpeg' : 'application/pdf'),
        size: file.size,
        isCover
      })
    });

    const presignJson = await presignRes.json();
    if (!presignRes.ok || !presignJson.success) {
      throw new Error(presignJson.error || 'Failed to generate secure upload URL.');
    }

    const { uploadUrl, publicUrl, objectKey } = presignJson.data;

    // 2. Direct binary PUT to Cloudflare R2
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || (isCover ? 'image/jpeg' : 'application/octet-stream')
      },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Cloudflare R2 upload rejected with status: ${uploadRes.status}`);
    }

    return {
      publicUrl,
      objectKey
    };
  }

  // ==========================================================================
  // 4. REALTIME PRESENTATION SESSIONS & MOBILE CONTROLLER
  // ==========================================================================

  async createPresentationSession(
    resourceId: string,
    totalSlides: number = 1
  ): Promise<{ data?: PresentationSession; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required to start a presentation session.' };

    try {
      const code = this.generateNumericCode();

      // Ensure any existing active sessions by this host for this resource are closed
      await supabase
        .from('presentation_sessions')
        .update({ status: 'ended' })
        .eq('host_user_id', userId)
        .eq('resource_id', resourceId)
        .eq('status', 'active');

      const { data, error } = await supabase
        .from('presentation_sessions')
        .insert({
          resource_id: resourceId,
          host_user_id: userId,
          session_code: code,
          current_slide: 1,
          total_slides: Math.max(1, totalSlides),
          controller_connected: false,
          status: 'active'
        })
        .select(`
          *,
          resource:library_resources (*)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { data: data as PresentationSession };
    } catch (err: any) {
      return { error: err.message || 'Failed to start presentation session.' };
    }
  }

  async getPresentationSessionByCode(
    sessionCode: string
  ): Promise<{ data?: PresentationSession; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const cleanCode = sessionCode.trim();

    try {
      const { data, error } = await supabase
        .from('presentation_sessions')
        .select(`
          *,
          resource:library_resources (*)
        `)
        .eq('session_code', cleanCode)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return { error: 'Invalid or expired session code. Please verify the 6-digit code on the presentation screen.' };
      }

      return { data: data as PresentationSession };
    } catch (err: any) {
      return { error: err.message || 'Error looking up presentation session.' };
    }
  }

  async getPresentationSessionById(
    sessionId: string
  ): Promise<{ data?: PresentationSession; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      const { data, error } = await supabase
        .from('presentation_sessions')
        .select(`
          *,
          resource:library_resources (*)
        `)
        .eq('id', sessionId)
        .maybeSingle();

      if (error || !data) {
        return { error: 'Presentation session not found.' };
      }

      return { data: data as PresentationSession };
    } catch (err: any) {
      return { error: err.message || 'Error loading presentation session.' };
    }
  }

  async updatePresentationSlide(
    sessionId: string,
    newSlide: number
  ): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({
          current_slide: newSlide,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('status', 'active');

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update slide position.' };
    }
  }

  async markControllerConnected(
    sessionId: string,
    connected: boolean = true
  ): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({
          controller_connected: connected,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update controller state.' };
    }
  }

  async endPresentationSession(sessionId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured.' };

    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({
          status: 'ended',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to end presentation session.' };
    }
  }

  /**
   * Sets up a real-time subscription for presentation slide synchronization.
   * Leverages both postgres_changes and broadcast channel for immediate updates.
   */
  subscribeToSession(
    sessionId: string,
    onUpdate: (payload: { current_slide: number; controller_connected: boolean; status: string }) => void
  ): { channel: RealtimeChannel; unsubscribe: () => void } {
    if (!supabase) {
      return {
        channel: null as any,
        unsubscribe: () => {}
      };
    }

    const channelName = `pres_session_${sessionId}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'presentation_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new) {
            onUpdate({
              current_slide: payload.new.current_slide,
              controller_connected: payload.new.controller_connected,
              status: payload.new.status
            });
          }
        }
      )
      .on('broadcast', { event: 'slide_change' }, (event) => {
        if (event.payload && typeof event.payload.current_slide === 'number') {
          onUpdate({
            current_slide: event.payload.current_slide,
            controller_connected: true,
            status: 'active'
          });
        }
      })
      .on('broadcast', { event: 'controller_joined' }, () => {
        onUpdate({
          current_slide: -1, // signal only
          controller_connected: true,
          status: 'active'
        });
      })
      .subscribe();

    return {
      channel,
      unsubscribe: () => {
        supabase?.removeChannel(channel);
      }
    };
  }

  /**
   * Broadcasts slide change directly to peers for instant zero-latency transition
   */
  async broadcastSlideChange(channel: RealtimeChannel, newSlide: number): Promise<void> {
    if (!channel) return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'slide_change',
        payload: { current_slide: newSlide }
      });
    } catch (err) {
      console.warn('[LibraryService] Realtime broadcast error:', err);
    }
  }

  async broadcastControllerJoined(channel: RealtimeChannel): Promise<void> {
    if (!channel) return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'controller_joined',
        payload: { joinedAt: Date.now() }
      });
    } catch (err) {
      console.warn('[LibraryService] Controller joined broadcast error:', err);
    }
  }
}

export const libraryService = new LibraryService();
