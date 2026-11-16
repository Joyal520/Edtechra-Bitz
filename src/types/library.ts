// ============================================================================
// EDTECHRA LIBRARY: TypeScript Type Definitions
// ============================================================================

export type LibraryFileType = 'pdf' | 'pptx' | 'web_blog' | 'game' | 'training';

export type TrainingFormat = 'video' | 'pdf' | 'pptx' | 'interactive';
export type TrainingDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface LibraryResource {
  id: string;
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
  instructor?: string | null;
  difficulty?: string | null;
  duration?: string | null;
  training_format?: TrainingFormat | null;
  published: boolean;
  uploaded_by?: string | null;
  total_slides?: number;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    full_name?: string;
    email?: string;
  } | null;
}

export function getNormalizedFileType(res: Partial<LibraryResource> | null | undefined): LibraryFileType {
  if (!res) return 'pdf';
  if (res.file_type === 'game') {
    return 'game';
  }
  if (res.file_type === 'training') {
    return 'training';
  }
  if (
    res.file_type === 'web_blog' ||
    res.category === 'Web / Blogs' ||
    res.file_key?.endsWith('.html') ||
    res.file_url?.endsWith('.html')
  ) {
    return 'web_blog';
  }
  if (res.file_type === 'pptx' || res.file_key?.endsWith('.pptx') || res.file_url?.endsWith('.pptx')) {
    return 'pptx';
  }
  return 'pdf';
}

export function getNormalizedTrainingFormat(res: Partial<LibraryResource> | null | undefined): TrainingFormat {
  if (!res) return 'interactive';
  if (res.training_format && ['video', 'pdf', 'pptx', 'interactive'].includes(res.training_format)) {
    return res.training_format;
  }
  const url = (res.file_url || '').toLowerCase();
  const key = (res.file_key || '').toLowerCase();
  if (url.endsWith('.pdf') || key.endsWith('.pdf')) return 'pdf';
  if (url.endsWith('.pptx') || url.endsWith('.ppt') || key.endsWith('.pptx')) return 'pptx';
  if (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.mov') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')
  ) {
    return 'video';
  }
  return 'interactive';
}

export type PresentationSessionStatus = 'active' | 'ended' | 'expired';

export interface PresentationSession {
  id: string;
  resource_id: string;
  host_user_id: string;
  session_code: string;
  current_slide: number;
  total_slides: number;
  controller_connected: boolean;
  status: PresentationSessionStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  resource?: LibraryResource | null;
}

export interface LibraryFilterState {
  search: string;
  subject: string;
  category: string;
  grade_level: string;
  file_type: 'all' | LibraryFileType;
  published?: 'all' | 'published' | 'unpublished'; // Admin only
}

export interface ParsedPptxSlide {
  slideNumber: number;
  title?: string;
  subtitle?: string;
  content: string[];
  bulletPoints: string[];
  images: string[]; // Blob URLs or data URLs
  notes?: string;
}

export interface ParsedPptxDeck {
  title: string;
  totalSlides: number;
  slides: ParsedPptxSlide[];
}
