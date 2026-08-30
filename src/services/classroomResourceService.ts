// ============================================================================
// EDTECHRA-BITZ: Classroom Resources & Cloud Material Library Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  ContentBucket,
  BucketItem,
  BucketItemType,
  TeacherCloudMaterial,
  TeacherStorageUsage
} from '@/types/classroom';

class ClassroomResourceService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

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

  // ==========================================================================
  // TEACHER CLOUD MATERIALS & REUSABLE R2 BUCKET METHODS
  // ==========================================================================

  /**
   * Retrieves all cloud materials uploaded by the authenticated teacher.
   * If classroomId is provided, returns each material with its `is_assigned` status for that classroom.
   */
  async getTeacherCloudMaterials(classroomId?: string): Promise<TeacherCloudMaterial[]> {
    try {
      const headers = await this.getAuthHeaders();
      const url = classroomId
        ? `/api/teacher/materials?classroomId=${encodeURIComponent(classroomId)}`
        : '/api/teacher/materials';

      const res = await fetch(url, { headers });
      const json = await res.json();

      if (res.ok && json.success) {
        return json.data || [];
      }

      // Supabase direct fallback if server offline
      const userId = await this.getUserId();
      if (!userId || !supabase) return [];

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or(`author_id.eq.${userId},teacher_id.eq.${userId}`)
        .eq('resource_purpose', 'teaching_resource')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((m: any) => {
        const sizeNum = Number(m.file_size || 0);
        let formattedSize = '0 B';
        if (sizeNum > 0) {
          if (sizeNum < 1024) formattedSize = `${sizeNum} B`;
          else if (sizeNum < 1024 * 1024) formattedSize = `${(sizeNum / 1024).toFixed(1)} KB`;
          else formattedSize = `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
        }

        return {
          id: m.id,
          title: m.title || m.name || 'Untitled Material',
          name: m.title || m.name || 'Untitled Material',
          original_filename: m.file_path || m.original_filename || `${m.title || 'document'}.pdf`,
          originalFilename: m.file_path || m.original_filename || `${m.title || 'document'}.pdf`,
          file_url: m.file_url,
          fileUrl: m.file_url,
          file_size: sizeNum,
          fileSize: sizeNum,
          formattedSize,
          mime_type: m.mime_type || 'application/pdf',
          category: m.category || m.resource_type || 'General',
          description: m.description || '',
          created_at: m.created_at,
          createdAt: m.created_at,
          is_assigned: false,
          isAssigned: false
        };
      });
    } catch (err) {
      console.error('[ClassroomResourceService] getTeacherCloudMaterials error:', err);
      return [];
    }
  }

  /**
   * Retrieves the teacher's Cloudflare R2 storage usage against the 500 MB quota.
   */
  async getTeacherStorageUsage(): Promise<TeacherStorageUsage> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/teacher/storage-usage', { headers });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn('[ClassroomResourceService] Storage usage API notice:', err);
    }

    // Client fallback calculation
    const materials = await this.getTeacherCloudMaterials();
    const usedBytes = materials.reduce((sum, m) => sum + (m.file_size || 0), 0);
    const maxBytes = 500 * 1024 * 1024;
    const remainingBytes = Math.max(0, maxBytes - usedBytes);
    const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(1));
    const maxMb = 500;
    const remainingMb = Number((remainingBytes / (1024 * 1024)).toFixed(1));
    const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

    return {
      usedBytes,
      maxBytes,
      usedMb,
      maxMb,
      remainingBytes,
      remainingMb,
      percentage,
      fileCount: materials.length
    };
  }

  /**
   * Finds an existing file in the teacher's cloud bucket with matching name or size.
   */
  async findMatchingCloudMaterial(filename: string, size?: number): Promise<TeacherCloudMaterial | null> {
    const materials = await this.getTeacherCloudMaterials();
    const targetName = String(filename || '').trim().toLowerCase();
    const targetSize = Number(size) || 0;

    return (
      materials.find((res) => {
        const resFilename = String(res.original_filename || res.originalFilename || '').trim().toLowerCase();
        const resTitle = String(res.title || '').trim().toLowerCase();
        if (targetName && (resFilename === targetName || `${resTitle}.pdf` === targetName || resTitle === targetName)) {
          return true;
        }
        if (targetSize > 0 && res.file_size === targetSize && targetName && resFilename.endsWith(targetName.split('.').pop() || '')) {
          return true;
        }
        return false;
      }) || null
    );
  }

  /**
   * Uploads a file from local device to teacher's Cloudflare R2 storage, creates the master record,
   * and optionally attaches it to the current classroom.
   */
  async uploadTeacherMaterial(payload: {
    file: File;
    title: string;
    category?: string;
    description?: string;
    classroomId?: string;
    bucketId?: string;
    onProgress?: (percent: number) => void;
  }): Promise<{ data?: TeacherCloudMaterial; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();

      // 1. Quota check & Presign R2 Upload
      const presignRes = await fetch('/api/teacher/materials/presign-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: payload.file.name,
          contentType: payload.file.type || 'application/pdf',
          size: payload.file.size
        })
      });

      const presignJson = await presignRes.json();
      if (!presignRes.ok || !presignJson.success) {
        return { error: presignJson.error || 'Failed to prepare upload. Storage quota may be exceeded.' };
      }

      const { uploadUrl, publicUrl, objectKey } = presignJson.data;

      // 2. Perform direct PUT to Cloudflare R2 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', payload.file.type || 'application/pdf');

        if (xhr.upload && payload.onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              payload.onProgress?.(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            payload.onProgress?.(100);
            resolve();
          } else {
            reject(new Error(`Cloudflare storage upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error uploading file to cloud storage.'));
        xhr.send(payload.file);
      });

      // 3. Register master material record in database
      const saveRes = await fetch('/api/teacher/materials', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: payload.title.trim(),
          description: (payload.description || '').trim(),
          category: (payload.category || 'General').trim(),
          fileUrl: publicUrl,
          objectKey,
          filename: payload.file.name,
          fileSize: payload.file.size,
          mimeType: payload.file.type || 'application/pdf',
          classroomId: payload.classroomId,
          bucketId: payload.bucketId
        })
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        return { error: saveJson.error || 'Failed to save material record.' };
      }

      return { data: saveJson.data };
    } catch (err: any) {
      console.error('[ClassroomResourceService] uploadTeacherMaterial error:', err);
      return { error: err.message || 'Error uploading file to cloud storage.' };
    }
  }

  /**
   * Idempotently assigns one or multiple existing cloud materials to a classroom.
   * Zero duplicate physical files created in R2, 0 MB added to storage usage.
   */
  async assignCloudMaterialsToClassroom(payload: {
    classroomId: string;
    resourceIds: string[];
    bucketId?: string;
  }): Promise<{ data?: { assignedCount: number; items: any[] }; error?: string }> {
    if (!payload.classroomId || !payload.resourceIds.length) {
      return { error: 'Please select at least one material to assign.' };
    }

    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/${payload.classroomId}/assign-materials`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resourceIds: payload.resourceIds,
          bucketId: payload.bucketId
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to assign materials to classroom.' };
      }

      return { data: json.data };
    } catch (err: any) {
      console.error('[ClassroomResourceService] assignCloudMaterialsToClassroom error:', err);
      return { error: err.message || 'Network error assigning materials.' };
    }
  }

  /**
   * Retrieves secure preview information for a material.
   */
  async getMaterialPreview(resourceId: string): Promise<{ data?: { id: string; title: string; fileUrl: string; originalFilename: string }; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/teacher/materials/${resourceId}/preview`, { headers });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return { error: json.error || 'Unable to preview material.' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch preview.' };
    }
  }

  /**
   * Soft deletes a teacher material.
   */
  async deleteTeacherMaterial(resourceId: string): Promise<{ error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/teacher/materials/${resourceId}`, {
        method: 'DELETE',
        headers
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to delete material.' };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Error deleting material.' };
    }
  }
}

export const classroomResourceService = new ClassroomResourceService();
