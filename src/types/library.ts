// ============================================================================
// EDTECHRA LIBRARY: TypeScript Type Definitions
// ============================================================================

export type LibraryFileType = 'pdf' | 'pptx';

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
  file_type: 'all' | 'pdf' | 'pptx';
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
