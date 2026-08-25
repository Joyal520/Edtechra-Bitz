// ============================================================================
// EDTECHRA-BITZ: Classroom Resources & Content Buckets Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { ContentBucket, BucketItem, BucketItemType } from '@/types/classroom';

class ClassroomResourceService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Retrieves content buckets and their items for a classroom
   */
  async getBucketsByClassroom(classroomId: string): Promise<ContentBucket[]> {
    if (!supabase || !classroomId) return [];

    try {
      const { data: buckets, error: bErr } = await supabase
        .from('content_buckets')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: true });

      if (bErr) throw bErr;

      const bucketList = buckets || [];
      if (bucketList.length === 0) return [];

      const bucketIds = bucketList.map((b) => b.id);

      const { data: items, error: iErr } = await supabase
        .from('bucket_items')
        .select('*')
        .in('bucket_id', bucketIds)
        .order('sort_order', { ascending: true });

      if (iErr) throw iErr;

      const itemsMap: Record<string, BucketItem[]> = {};
      (items || []).forEach((item: any) => {
        if (!itemsMap[item.bucket_id]) itemsMap[item.bucket_id] = [];
        itemsMap[item.bucket_id].push(item);
      });

      return bucketList.map((b) => ({
        ...b,
        items: itemsMap[b.id] || []
      }));
    } catch (err) {
      console.error('[ClassroomResourceService] getBucketsByClassroom error:', err);
      return [];
    }
  }

  /**
   * Creates a new content bucket
   */
  async createBucket(payload: {
    classroom_id: string;
    title: string;
    description?: string;
  }): Promise<{ data?: ContentBucket; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      const { data, error } = await supabase
        .from('content_buckets')
        .insert({
          classroom_id: payload.classroom_id,
          title: payload.title.trim(),
          description: (payload.description || '').trim(),
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return { data: { ...data, items: [] } };
    } catch (err: any) {
      console.error('[ClassroomResourceService] createBucket error:', err);
      return { error: err.message || 'Failed to create resource bucket.' };
    }
  }

  /**
   * Adds an item to a bucket
   */
  async addItemToBucket(payload: {
    bucket_id: string;
    classroom_id: string;
    title: string;
    item_type: BucketItemType;
    content_id?: string | null;
    content_url?: string | null;
    thumbnail_url?: string | null;
  }): Promise<{ data?: BucketItem; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };

    try {
      const { data, error } = await supabase
        .from('bucket_items')
        .insert({
          bucket_id: payload.bucket_id,
          classroom_id: payload.classroom_id,
          title: payload.title.trim(),
          item_type: payload.item_type,
          content_id: payload.content_id || null,
          content_url: payload.content_url || null,
          thumbnail_url: payload.thumbnail_url || null,
          sort_order: 0
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[ClassroomResourceService] addItemToBucket error:', err);
      return { error: err.message || 'Failed to add item to bucket.' };
    }
  }

  /**
   * Deletes a bucket item
   */
  async deleteItem(itemId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('bucket_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete item.' };
    }
  }

  /**
   * Deletes a bucket
   */
  async deleteBucket(bucketId: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      const { error } = await supabase
        .from('content_buckets')
        .delete()
        .eq('id', bucketId);

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete bucket.' };
    }
  }
}

export const classroomResourceService = new ClassroomResourceService();
