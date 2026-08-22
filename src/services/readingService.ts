// ============================================================================
// EDTECHRA-BITZ: One-Minute Reading API Service (Client-Side)
// ============================================================================

import {
  ReadingBit,
  RawReadingInput,
  ReadingAdminStats,
  PresignedUploadResponse,
  ReadingImageGenerationResult,
  BulkMissingImagesResult
} from '@/types';
import { supabase } from '@/lib/supabase';

class ReadingService {
  /**
   * Resolves a valid Supabase JWT access token for authorization headers.
   */
  async getValidAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) return explicitToken;
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.access_token) {
          return session.access_token;
        }
      } catch (err) {
        console.warn('[ReadingService] Failed to retrieve session:', err);
      }
    }
    return null;
  }

  private async getAuthHeaders(explicitToken?: string | null): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = await this.getValidAuthToken(explicitToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Requests a secure presigned upload URL for Cloudflare R2 cover image upload
   */
  async requestPresignedCoverUpload(
    params: { readingId?: string; filename: string; contentType: string; size: number },
    token?: string | null
  ): Promise<PresignedUploadResponse> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required to upload cover images.');
    }

    const res = await fetch('/api/readings/presign-upload', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate cover upload URL.');
    }

    const json = await res.json();
    return json.data as PresignedUploadResponse;
  }

  /**
   * Uploads Blob directly to R2 using presigned URL with real progress tracking
   */
  uploadCoverToR2(
    uploadUrl: string,
    headers: Record<string, string>,
    blob: Blob,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(Math.min(99, percent));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`R2 direct upload failed with status ${xhr.status}.`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during cover image upload.'));
      };

      xhr.send(blob);
    });
  }

  /**
   * Fetches published readings pool for student feed interleaving
   */
  async getFeedReadings(token?: string | null): Promise<ReadingBit[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/readings/feed', { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[ReadingService] getFeedReadings error:', json.error);
        return [];
      }

      return (json.data || []) as ReadingBit[];
    } catch (err) {
      console.warn('[ReadingService] getFeedReadings fetch error:', err);
      return [];
    }
  }

  /**
   * Admin API: Fetches all readings with filtering and stats
   */
  async getAdminReadings(
    params: {
      search?: string;
      category?: string;
      level?: string;
      published?: string;
      page?: number;
      limit?: number;
    } = {},
    token?: string | null
  ): Promise<{ readings: ReadingBit[]; stats: ReadingAdminStats; total: number }> {
    const defaultStats: ReadingAdminStats = {
      totalReadings: 0,
      publishedReadings: 0,
      draftReadings: 0,
      readingsWithImages: 0,
      readingsWithoutImages: 0
    };

    try {
      const headers = await this.getAuthHeaders(token);
      const query = new URLSearchParams();

      if (params.search) query.set('search', params.search);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.level && params.level !== 'all') query.set('level', params.level);
      if (params.published && params.published !== 'all') query.set('published', params.published);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`/api/readings/admin?${query.toString()}`, { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { readings: [], stats: defaultStats, total: 0 };
      }

      return {
        readings: json.data?.readings || [],
        stats: json.data?.stats || defaultStats,
        total: json.data?.total || 0
      };
    } catch (err) {
      console.warn('[ReadingService] getAdminReadings fetch error:', err);
      return { readings: [], stats: defaultStats, total: 0 };
    }
  }

  /**
   * Admin API: Creates a new One-Minute Reading
   */
  async createReading(
    input: RawReadingInput,
    token?: string | null
  ): Promise<ReadingBit> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/readings', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create reading.');
    }

    return json.data as ReadingBit;
  }

  /**
   * Admin API: Bulk imports an array of readings (creates individual records & individual R2 content objects)
   */
  async importBatchReadings(
    readings: RawReadingInput[],
    token?: string | null
  ): Promise<{
    success: boolean;
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    data: ReadingBit[];
    errors: any[];
  }> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/readings/import-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ readings })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to import reading batch.');
    }

    return json;
  }

  /**
   * Admin API: Updates a reading
   */
  async updateReading(
    id: string,
    updates: Partial<RawReadingInput>,
    token?: string | null
  ): Promise<ReadingBit> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/readings/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update reading.');
    }

    return json.data as ReadingBit;
  }

  /**
   * Admin API: Updates or adds a cover image to an existing reading without duplicating
   */
  async updateReadingCover(
    id: string,
    coverData: { cover_image_url: string | null; cover_image_object_key?: string | null },
    token?: string | null
  ): Promise<ReadingBit> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/readings/${encodeURIComponent(id)}/cover`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(coverData)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update reading cover image.');
    }

    return json.data as ReadingBit;
  }

  /**
   * Admin API: Toggles publication status
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
    token?: string | null
  ): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/readings/${encodeURIComponent(id)}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published: isPublished })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to toggle publication status.');
    }

    return Boolean(json.is_published);
  }

  /**
   * Admin API: Deletes a reading permanently
   */
  async deleteReading(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/readings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete reading.');
    }
  }

  /**
   * Records student reading completion
   */
  async completeReading(readingId: string, token?: string | null): Promise<void> {
    try {
      const headers = await this.getAuthHeaders(token);
      await fetch('/api/readings/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ readingId })
      });
    } catch {
      // Non-critical
    }
  }

  /**
   * Admin API: Generates or regenerates an AI cover image for an article using Gemini
   */
  async generateReadingImage(
    readingId: string,
    options: { force?: boolean; regenerate?: boolean; customPrompt?: string } = {},
    token?: string | null
  ): Promise<ReadingImageGenerationResult> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/admin/readings/${encodeURIComponent(readingId)}/generate-image`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok && !json.data) {
      throw new Error(json.error || 'Failed to generate article image.');
    }

    return {
      success: Boolean(json.success),
      readingId,
      imageUrl: json.data?.cover_image_url || null,
      objectKey: json.data?.cover_image_object_key || null,
      prompt: json.data?.image_prompt || null,
      status: json.data?.image_status || (json.success ? 'generated' : 'failed'),
      error: json.error || null,
      reading: json.data as ReadingBit
    };
  }

  /**
   * Admin API: Queries how many published articles currently lack cover images
   */
  async getMissingImagesCount(token?: string | null): Promise<{ count: number; articles: Array<{ id: string; title: string }> }> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/admin/readings/generate-missing-images', {
        method: 'POST',
        headers,
        body: JSON.stringify({ dryRun: true })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return {
          count: json.totalFound || 0,
          articles: json.articles || []
        };
      }
      return { count: 0, articles: [] };
    } catch {
      return { count: 0, articles: [] };
    }
  }

  /**
   * Admin API: Triggers batch generation of missing AI cover images
   */
  async generateMissingImages(
    options: { limit?: number } = {},
    token?: string | null
  ): Promise<BulkMissingImagesResult> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/admin/readings/generate-missing-images', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dryRun: false, limit: options.limit || 100 })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to perform bulk image generation.');
    }

    return {
      totalFound: json.totalFound || 0,
      completed: json.completed || 0,
      failed: json.failed || 0,
      skipped: json.skipped || 0,
      results: json.results || []
    };
  }

  /**
   * Admin API: Queries how many published articles currently have failed image generations
   */
  async getFailedImagesCount(token?: string | null): Promise<{ count: number; articles: Array<{ id: string; title: string }> }> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/admin/readings/retry-failed-images', {
        method: 'POST',
        headers,
        body: JSON.stringify({ dryRun: true })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        return {
          count: json.totalFound || 0,
          articles: json.articles || []
        };
      }
      return { count: 0, articles: [] };
    } catch {
      return { count: 0, articles: [] };
    }
  }

  /**
   * Admin API: Triggers batch retry of failed AI cover images
   */
  async retryFailedImages(
    options: { limit?: number } = {},
    token?: string | null
  ): Promise<BulkMissingImagesResult> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/admin/readings/retry-failed-images', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dryRun: false, limit: options.limit || 100 })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to retry failed image generations.');
    }

    return {
      totalFound: json.totalFound || 0,
      completed: json.completed || 0,
      failed: json.failed || 0,
      skipped: json.skipped || 0,
      results: json.results || []
    };
  }
}

export const readingService = new ReadingService();
