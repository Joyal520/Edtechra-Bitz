export interface PostAuthor {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: 'student' | 'admin';
}

export interface StudentPost {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  image_object_key: string;
  storage_provider: 'r2' | 'supabase';
  status: 'pending' | 'approved' | 'rejected' | 'review';
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'review';
  moderation_reason?: string;
  moderated_at?: string;
  likes_count: number;
  comments_count: number;
  xp_awarded?: number;
  is_liked_by_me?: boolean;
  is_saved_by_me?: boolean;
  image_width?: number;
  image_height?: number;
  image_size_bytes?: number;
  image_format?: string;
  created_at: string;
  updated_at: string;
  author: PostAuthor;
}

export interface PostUserStats {
  postsCount: number;
  likesReceived: number;
  totalPostXp: number;
}

export interface CreatePostPayload {
  caption: string;
  image_url: string;
  image_object_key: string;
  storage_provider?: 'r2' | 'supabase';
  image_width?: number;
  image_height?: number;
  image_size_bytes?: number;
  image_format?: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  headers: Record<string, string>;
  objectKey: string;
  publicUrl: string;
  storageProvider: 'r2';
}

export interface PostFeedResponse {
  success: boolean;
  posts: StudentPost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
