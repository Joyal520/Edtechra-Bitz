import { StudentPost, CreatePostPayload, PresignedUploadResponse, PostFeedResponse, PostUserStats } from '@/types/post';
import { supabase } from '@/lib/supabase';

class PostService {
  /**
   * Resolves a fresh, valid Supabase JWT access token.
   * If an explicit token is passed, uses it. Otherwise, calls supabase.auth.getSession()
   * to automatically retrieve or refresh the active session token.
   */
  async getValidAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) {
      return explicitToken;
    }

    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.access_token) {
          return session.access_token;
        }
      } catch (err) {
        console.warn('[PostService] Failed to retrieve active session from Supabase:', err);
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
   * Requests a secure presigned upload URL from the server for Cloudflare R2
   */
  async requestPresignedUpload(
    params: { filename: string; contentType: string; size: number },
    token?: string | null
  ): Promise<PresignedUploadResponse> {
    const headers = await this.getAuthHeaders(token);

    if (!headers['Authorization']) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const res = await fetch('/api/posts/presign-upload', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (res.status === 403) {
        throw new Error('Your account does not have permission to upload media.');
      }
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
      const headers = await this.getAuthHeaders(token);
      await fetch('/api/posts/rollback-upload', {
        method: 'POST',
        headers,
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
    const headers = await this.getAuthHeaders(token);

    if (!headers['Authorization']) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (res.status === 403) {
        throw new Error('Your account does not have permission to create posts.');
      }
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
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/moderation/posts?status=${encodeURIComponent(status)}`, {
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error('Admin authorization required to view moderation queue.');
      }
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
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/admin/moderation/posts/${encodeURIComponent(postId)}/action`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error('Admin authorization required.');
      }
      throw new Error(err.error || 'Failed to execute moderation action.');
    }

    const data = await res.json();
    return data.data;
  }

  /**
   * Fetches paginated posts from the backend feed with automatic Supabase fallback
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

    // 1. Primary: Server API
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch(`/api/posts?${query.toString()}`, {
        headers
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.posts) && data.posts.length > 0) {
          return data;
        }
      }
    } catch (fetchErr) {
      console.warn('[PostService] Primary /api/posts fetch notice, trying direct Supabase fallback:', fetchErr);
    }

    // 2. Direct Supabase Client Fallback
    if (supabase) {
      try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let queryBuilder = supabase
          .from('student_posts')
          .select('*, profiles(id, full_name, email, avatar_url, role)', { count: 'exact' })
          .eq('status', 'approved');

        if (sort === 'popular') {
          queryBuilder = queryBuilder.order('likes_count', { ascending: false });
        } else {
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
        }

        const { data, count, error } = await queryBuilder.range(from, to);

        if (!error && Array.isArray(data)) {
          const total = count || data.length;
          const formattedPosts = data.map(p => ({
            ...p,
            author: p.profiles || {
              id: p.user_id,
              full_name: 'Student',
              email: '',
              role: 'student'
            }
          }));

          return {
            success: true,
            posts: formattedPosts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: from + limit < total
          };
        }
      } catch (sbErr) {
        console.warn('[PostService] Direct Supabase fallback notice:', sbErr);
      }
    }

    return {
      success: true,
      posts: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false
    };
  }

  /**
   * Deletes a student post and associated R2 object
   */
  async deletePost(postId: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to delete this post.');
      }
      throw new Error(err.error || 'Failed to delete post.');
    }
  }

  /**
   * Toggles like state for a post
   */
  async toggleLike(postId: string, token?: string | null): Promise<{ liked: boolean; likesCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error('Please sign in to like posts.');
      }
      throw new Error(err.error || 'Failed to update post like.');
    }

    const data = await res.json();
    return data.data;
  }

  /**
   * Retrieves total user posts, likes received, and post XP for Dashboard
   */
  async getUserPostStats(userId: string, token?: string | null): Promise<PostUserStats> {
    const defaultStats: PostUserStats = { postsCount: 0, likesReceived: 0, totalPostXp: 0 };
    if (!userId || userId === 'guest-user') return defaultStats;

    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch(`/api/posts/user-stats/${encodeURIComponent(userId)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data as PostUserStats;
        }
      }
    } catch (e) {
      console.warn('[PostService] API getUserPostStats notice, falling back to direct query:', e);
    }

    // Direct Supabase fallback
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('student_posts')
          .select('id, likes_count, status')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (!error && data) {
          const postsCount = data.length;
          const likesReceived = data.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0);
          return {
            postsCount,
            likesReceived,
            totalPostXp: postsCount * 10
          };
        }
      } catch (err) {
        console.warn('[PostService] Supabase fallback post stats error:', err);
      }
    }

    return defaultStats;
  }
}

export const postService = new PostService();
