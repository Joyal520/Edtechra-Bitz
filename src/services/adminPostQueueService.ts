// ============================================================================
// EDTECHRA-BITZ: Admin Post Queue Client Service
// Handles batch presigned URLs, direct R2 uploads, queue submissions & controls
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  AdminPostQueueBatchSummary,
  CreateBatchQueuePayload,
  PresignedUploadResponse,
  QueueOverviewStats
} from '@/types';

export interface BatchPresignedItem extends PresignedUploadResponse {
  filename: string;
}

export interface QueueOverviewResponse {
  success: boolean;
  stats: QueueOverviewStats;
  batches: AdminPostQueueBatchSummary[];
  totalBatches: number;
  rawQueueCount: number;
}

class AdminPostQueueService {
  /**
   * Resolves a valid Supabase JWT access token
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
        console.warn('[AdminPostQueueService] Session fetch notice:', err);
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
   * Requests batch presigned upload URLs for multiple image files
   */
  async requestBatchPresignedUploads(
    files: Array<{ filename: string; contentType: string; size: number }>,
    token?: string | null
  ): Promise<BatchPresignedItem[]> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Administrator session expired. Please log in again.');
    }

    const res = await fetch('/api/admin/posts/queue/presign-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ files })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error('Access denied: Administrator privileges required.');
      }
      throw new Error(err.error || 'Failed to generate batch upload URLs.');
    }

    const json = await res.json();
    return json.data as BatchPresignedItem[];
  }

  /**
   * Uploads a single Blob to Cloudflare R2 using XMLHttpRequest for accurate progress
   */
  uploadSingleBlobToR2(
    uploadUrl: string,
    headers: Record<string, string>,
    blob: Blob,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      Object.entries(headers || {}).forEach(([key, value]) => {
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
          reject(new Error(`R2 direct upload failed with HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error uploading image to R2.'));
      };

      xhr.send(blob);
    });
  }

  /**
   * Uploads a list of image blobs in parallel/sequence with total progress callback
   */
  async uploadBatchImagesToR2(
    items: Array<{ file: File | Blob; presigned: BatchPresignedItem }>,
    onProgress?: (current: number, total: number, percent: number) => void
  ): Promise<void> {
    const total = items.length;
    let completed = 0;

    for (let i = 0; i < items.length; i++) {
      const { file, presigned } = items[i];
      await this.uploadSingleBlobToR2(
        presigned.uploadUrl,
        presigned.headers,
        file,
        (filePercent) => {
          if (onProgress) {
            const overallPercent = Math.round(((completed + (filePercent / 100)) / total) * 100);
            onProgress(completed + 1, total, overallPercent);
          }
        }
      );
      completed++;
      if (onProgress) {
        onProgress(completed, total, Math.round((completed / total) * 100));
      }
    }
  }

  /**
   * Submits a newly uploaded batch to the persistent publishing queue
   */
  async submitBulkUploadQueue(
    payload: CreateBatchQueuePayload,
    token?: string | null
  ): Promise<{ success: boolean; batchId: string; totalQueued: number }> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Administrator session expired. Please log in again.');
    }

    const res = await fetch('/api/admin/posts/queue/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error('Access denied: Administrator privileges required.');
      }
      throw new Error(err.error || 'Failed to submit batch to publishing queue.');
    }

    return await res.json();
  }

  /**
   * Fetches persistent queue overview & batch progress
   */
  async getQueueOverview(token?: string | null): Promise<QueueOverviewResponse> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Administrator session expired. Please log in again.');
    }

    const res = await fetch('/api/admin/posts/queue', {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retrieve queue overview.');
    }

    return await res.json();
  }

  /**
   * Trigger immediate publication of a specific queue item
   */
  async publishItemNow(itemId: string, token?: string | null): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/posts/queue/${itemId}/publish-now`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to publish item immediately.');
    }

    return await res.json();
  }

  /**
   * Pause a batch
   */
  async pauseBatch(batchId: string, token?: string | null): Promise<{ success: boolean; pausedCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/posts/queue/batch/${batchId}/pause`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to pause batch.');
    }

    return await res.json();
  }

  /**
   * Resume a paused batch
   */
  async resumeBatch(batchId: string, token?: string | null): Promise<{ success: boolean; resumedCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/posts/queue/batch/${batchId}/resume`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to resume batch.');
    }

    return await res.json();
  }

  /**
   * Cancel remaining items in a batch
   */
  async cancelBatch(batchId: string, token?: string | null): Promise<{ success: boolean; cancelledCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/posts/queue/batch/${batchId}/cancel`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel batch.');
    }

    return await res.json();
  }

  /**
   * Retry a failed queue item
   */
  async retryFailedItem(itemId: string, token?: string | null): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/posts/queue/${itemId}/retry`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to retry failed queue item.');
    }

    return await res.json();
  }
}

export const adminPostQueueService = new AdminPostQueueService();
