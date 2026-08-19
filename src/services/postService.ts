import { StudentPost, CreatePostPayload, PresignedUploadResponse, PostFeedResponse } from '@/types/post';

class PostService {
  private getAuthHeaders(token?: string | null): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Requests a secure presigned upload URL from the server for Cloudflare R2
   */
  async requestPresignedUpload(
    params: { filename: string; contentType: string; size: number },
    token?: string | null
  ): Promise<PresignedUploadResponse> {
    const res = await fetch('/api/posts/presign-upload', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initialize image upload.');
    }

    const data = await res.json();
    return data.data as PresignedUploadResponse;
  }

  /**
   * Uploads the optimized WebP Blob directly to Cloudflare R2 using the presigned PUT URL.
   * Uses XMLHttpRequest for genuine, accurate upload progress tracking.
   */
  uploadBlobToR2(
    uploadUrl: string,
    headers: Record<string, string>,
    blob: Blob,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      // Apply required signed headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      // Track real upload progress
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
        reject(new Error('Network error occurred during image upload to R2 storage.'));
      };

      xhr.send(blob);
    });
  }

  /**
   * Rolls back an orphaned R2 upload if database post creation fails
   */
  async rollbackR2Upload(objectKey: string, token?: string | null): Promise<void> {
    try {
      await fetch('/api/posts/rollback-upload', {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ objectKey })
      });
    } catch (e) {
      console.warn('[PostService] R2 rollback warning:', e);
    }
  }

  /**
   * Creates the post record in Supabase / backend database with AI moderation
   */
  async createPost(
    payload: CreatePostPayload,
    token?: string | null
  ): Promise<{ post: StudentPost; moderationStatus: 'approved' | 'review'; message?: string }> {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Rejection or Error
      const errorMsg = data.error || 'Failed to create student post.';
      throw new Error(errorMsg);
    }

    return {
      post: data.data as StudentPost,
      moderationStatus: data.moderation?.status || 'approved',
      message: data.message
    };
  }

  /**
   * Admin API: Fetches posts in moderation queue (review/pending/rejected)
   */
  async getAdminModerationQueue(
    status: 'review' | 'pending' | 'rejected' | 'all' = 'review',
    token?: string | null
  ): Promise<{ success: boolean; posts: StudentPost[]; total: number }> {
    const res = await fetch(`/api/admin/moderation/posts?status=${encodeURIComponent(status)}`, {
      headers: this.getAuthHeaders(token)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin moderation queue.');
    }

    return await res.json();
  }

  /**
   * Admin API: Approves or rejects a review post
   */
  async takeAdminModerationAction(
    postId: string,
    action: 'approve' | 'reject',
    reason?: string,
    token?: string | null
  ): Promise<StudentPost> {
    const res = await fetch(`/api/admin/moderation/posts/${encodeURIComponent(postId)}/action`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ action, reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute moderation action.');
    }

    const data = await res.json();
    return data.data;
  }

  /**
   * Fetches paginated posts from the backend feed
   */
  async getPosts(
    params: { page?: number; limit?: number; sort?: 'newest' | 'popular' } = {},
    token?: string | null
  ): Promise<PostFeedResponse> {
    const { page = 1, limit = 10, sort = 'newest' } = params;
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort
    });

    const res = await fetch(`/api/posts?${query.toString()}`, {
      headers: this.getAuthHeaders(token)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch student post feed.');
    }

    return await res.json();
  }

  /**
   * Deletes a student post and associated R2 object
   */
  async deletePost(postId: string, token?: string | null): Promise<void> {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete post.');
    }
  }

  /**
   * Toggles like state for a post
   */
  async toggleLike(postId: string, token?: string | null): Promise<{ liked: boolean; likesCount: number }> {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(token)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update post like.');
    }

    const data = await res.json();
    return data.data;
  }
}

export const postService = new PostService();
