// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO CLIENT SERVICE
// Complete API client for Teacher Course Studio, AI Lesson & Question Generation,
// R2 Visual Compression Uploads, Classroom Assignments, and Learning Telemetry.
// ============================================================================

import { getAuthHeaders, authenticatedFetch } from '@/lib/apiAuth';
import {
  Course,
  CourseUnit,
  CourseEpisode,
  CourseBlock,
  CourseQuestion,
  CourseClassroomAssignment,
  CourseAnalyticsSummary,
  AILessonGenerationPayload,
  AILessonGenerationResponse,
  AIQuestionGenerationPayload,
  AIQuestionGenerationResponse,
  AICoursePlanPayload,
  AICoursePlanResponse,
  AIStructuredLessonPayload,
  AIStructuredLessonResponse,
  CourseAssignmentSettings,
  EssayEvaluationResult
} from '@/types/courseStudio';
import { optimizeImageForUpload } from '@/utils/imageOptimization';

const API_BASE = '/api/course-studio';

// Centralized auth header resolution via @/lib/apiAuth
async function getAuthHeader(): Promise<Record<string, string>> {
  return await getAuthHeaders();
}

// Fast in-memory + sessionStorage cache for course details
const _courseMemoryCache = new Map<string, { course: Course; timestamp: number }>();
const _courseInFlight = new Map<string, Promise<Course>>();
const COURSE_CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh TTL

function getCourseCacheKey(courseId: string): string {
  return `edtechra_course_cache_v1_${courseId}`;
}

function readCachedCourse(courseId: string): { course: Course; isFresh: boolean } | null {
  const now = Date.now();
  const mem = _courseMemoryCache.get(courseId);
  if (mem) {
    return { course: mem.course, isFresh: now - mem.timestamp < COURSE_CACHE_TTL_MS };
  }
  try {
    const raw = sessionStorage.getItem(getCourseCacheKey(courseId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.course && parsed.course.id === courseId) {
        _courseMemoryCache.set(courseId, { course: parsed.course, timestamp: parsed.timestamp || 0 });
        return { course: parsed.course, isFresh: now - (parsed.timestamp || 0) < COURSE_CACHE_TTL_MS };
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeCachedCourse(courseId: string, course: Course): void {
  const entry = { course, timestamp: Date.now() };
  _courseMemoryCache.set(courseId, entry);
  try {
    sessionStorage.setItem(getCourseCacheKey(courseId), JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function invalidateCourseCache(courseId?: string): void {
  if (courseId) {
    _courseMemoryCache.delete(courseId);
    _courseInFlight.delete(courseId);
    try {
      sessionStorage.removeItem(getCourseCacheKey(courseId));
    } catch {
      // ignore
    }
  } else {
    _courseMemoryCache.clear();
    _courseInFlight.clear();
  }
}

export const courseStudioService = {
  getCachedCourseSync(courseId: string): Course | null {
    return readCachedCourse(courseId)?.course || null;
  },

  invalidateCourseCache,

  // --------------------------------------------------------------------------
  // 1. COURSE CRUD
  // --------------------------------------------------------------------------

  async getCourses(): Promise<Course[]> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses`, { headers });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Unable to load Course Studio courses (HTTP ${res.status}).`);
    }
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `Failed to fetch courses (HTTP ${res.status}).`);
    }
    return Array.isArray(json.courses) ? json.courses : [];
  },

  async getCourse(courseId: string, options?: { forceRefresh?: boolean }): Promise<Course> {
    if (!options?.forceRefresh) {
      const cached = readCachedCourse(courseId);
      if (cached?.isFresh) {
        return cached.course;
      }
    }

    const existingInFlight = _courseInFlight.get(courseId);
    if (existingInFlight && !options?.forceRefresh) {
      return existingInFlight;
    }

    const fetchPromise = (async () => {
      try {
        const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch course details.');
        }
        writeCachedCourse(courseId, json.course);
        return json.course as Course;
      } catch (err) {
        const stale = readCachedCourse(courseId);
        if (stale?.course) {
          return stale.course;
        }
        throw err;
      } finally {
        _courseInFlight.delete(courseId);
      }
    })();

    _courseInFlight.set(courseId, fetchPromise);
    return fetchPromise;
  },

  async createCourse(payload: {
    title: string;
    short_description?: string;
    subject?: string;
    grade_level?: string;
    cover_image_url?: string | null;
    cover_image_key?: string | null;
    cover_aspect_ratio?: '1:1' | '16:9';
    course_type?: 'full' | 'quick';
  }): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create course.');
    }
    return json.course;
  },

  async updateCourse(
    courseId: string,
    updates: Partial<{
      title: string;
      short_description: string;
      subject: string;
      grade_level: string;
      cover_image_url: string | null;
      cover_image_key: string | null;
      cover_aspect_ratio: '1:1' | '16:9';
      status: 'draft' | 'published' | 'archived';
      daily_release_enabled: boolean;
      course_timezone: string;
      course_start_date: string;
      daily_release_interval_days: number;
    }>
  ): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course.');
    }
    invalidateCourseCache(courseId);
    return json.course;
  },

  async deleteCourse(courseId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete course.');
    }
    invalidateCourseCache(courseId);
  },

  async duplicateCourse(courseId: string): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/duplicate`, {
      method: 'POST',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to duplicate course.');
    }
    return json.course;
  },

  // --------------------------------------------------------------------------
  // 2. UNITS & EPISODES
  // --------------------------------------------------------------------------

  async createUnit(courseId: string, payload: { title: string; description?: string; order_index?: number }): Promise<CourseUnit> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/units`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create unit.');
    invalidateCourseCache(courseId);
    return json.unit;
  },

  async updateUnit(courseId: string, unitId: string, updates: Partial<{ title: string; description: string; order_index: number }>): Promise<CourseUnit> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/units/${unitId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update unit.');
    invalidateCourseCache(courseId);
    return json.unit;
  },

  async deleteUnit(courseId: string, unitId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/units/${unitId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete unit.');
    invalidateCourseCache(courseId);
  },

  async createEpisode(
    courseId: string,
    payload: { unit_id: string; title: string; episode_type?: string; order_index?: number; estimated_minutes?: number }
  ): Promise<CourseEpisode> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create episode.');
    invalidateCourseCache(courseId);
    return json.episode;
  },

  async updateEpisode(
    courseId: string,
    episodeId: string,
    updates: Partial<{
      title: string;
      episode_type: string;
      order_index: number;
      position: number;
      estimated_minutes: number;
      daily_release_enabled: boolean;
      release_day: number;
      is_manually_unlocked: boolean;
    }>
  ): Promise<CourseEpisode> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update episode.');
    invalidateCourseCache(courseId);
    return json.episode;
  },

  async reorderEpisodes(courseId: string, unitId: string, episodeIds: string[]): Promise<void> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes/reorder`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ unit_id: unitId, episode_ids: episodeIds })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to reorder episodes.');
    invalidateCourseCache(courseId);
  },

  async manuallyUnlockEpisode(courseId: string, episodeId: string): Promise<CourseEpisode> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}/unlock`, {
      method: 'POST',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to unlock episode.');
    invalidateCourseCache(courseId);
    return json.episode;
  },

  async deleteEpisode(courseId: string, episodeId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete episode.');
    invalidateCourseCache(courseId);
  },

  // --------------------------------------------------------------------------
  // 3. CONTENT BLOCKS & QUESTIONS
  // --------------------------------------------------------------------------

  async saveEpisodeBlocks(courseId: string, episodeId: string, blocks: Partial<CourseBlock>[]): Promise<CourseBlock[]> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}/blocks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ blocks })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save blocks.');
    invalidateCourseCache(courseId);
    return json.blocks;
  },

  async saveEpisodeQuestions(courseId: string, episodeId: string, questions: Partial<CourseQuestion>[]): Promise<CourseQuestion[]> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ episode_id: episodeId, questions })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save questions.');
    invalidateCourseCache(courseId);
    return json.questions;
  },

  // --------------------------------------------------------------------------
  // 4. PUBLISHING & MULTI-CLASSROOM ASSIGNMENTS
  // --------------------------------------------------------------------------

  async publishAndAssignCourse(
    courseId: string,
    payload: {
      classroom_ids: string[];
      start_date?: string;
      due_date?: string | null;
      settings?: Partial<CourseAssignmentSettings>;
      daily_release_enabled?: boolean;
      course_start_date?: string;
      course_timezone?: string;
      daily_release_interval_days?: number;
    }
  ): Promise<{ course: Course; assigned_count: number; assignments: CourseClassroomAssignment[] }> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/publish-and-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to publish & assign course.');
    invalidateCourseCache(courseId);
    return json;
  },

  async unpublishCourse(courseId: string): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/unpublish`, {
      method: 'POST',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to unpublish course.');
    invalidateCourseCache(courseId);
    return json.course;
  },

  async pauseCourse(courseId: string, classroomId?: string): Promise<{ success: boolean; status: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/pause`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ classroom_id: classroomId })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to pause course.');
    invalidateCourseCache(courseId);
    return json;
  },

  async resumeCourse(courseId: string, classroomId?: string): Promise<{ success: boolean; status: string; message: string }> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/resume`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ classroom_id: classroomId })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to resume course.');
    invalidateCourseCache(courseId);
    return json;
  },

  async getStudentProgress(courseId: string, classroomId: string): Promise<{
    enrollment: any;
    completedEpisodeIds: string[];
    completedEpisodesMap?: Record<string, { completed_at?: string | null; score?: number; percentage?: number }>;
    last_completed_at?: string | null;
    progress_percent: number;
    daily_release_enabled?: boolean;
    daily_release_interval_days?: number;
    course_start_date?: string | null;
    course_timezone?: string;
    allow_retries?: boolean;
    server_time?: string;
    is_paused?: boolean;
    is_teacher?: boolean;
    is_preview?: boolean;
    total_classroom_points?: number;
    attempts?: any[];
  }> {
    const headers = await getAuthHeader();
    const params = new URLSearchParams({ course_id: courseId, classroom_id: classroomId });
    const res = await authenticatedFetch(`${API_BASE}/student/progress?${params.toString()}`, { headers });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { enrollment: null, completedEpisodeIds: [], progress_percent: 0 };
    }
    return json;
  },

  async getCourseAnalytics(courseId: string): Promise<CourseAnalyticsSummary> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/analytics`, { headers });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch course analytics.');
    return json.analytics;
  },

  // --------------------------------------------------------------------------
  // 5. IMAGE OPTIMIZATION & CLOUDFLARE R2 UPLOAD
  // --------------------------------------------------------------------------

  async uploadCourseImage(
    file: File,
    courseId: string = 'general',
    isCover: boolean = false
  ): Promise<{ publicUrl: string; storageKey: string; width: number; height: number }> {
    // 1. Compress image in browser canvas
    const optimized = await optimizeImageForUpload(file, {
      maxWidth: isCover ? 1920 : 1280,
      maxHeight: isCover ? 1080 : 960,
      quality: 0.85,
      format: 'image/webp'
    });

    // 2. Request presigned URL from backend with auto-refreshing authenticatedFetch
    const presignRes = await authenticatedFetch(`${API_BASE}/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        filename: optimized.file.name,
        contentType: optimized.mimeType,
        size: optimized.optimizedSize,
        isCover
      })
    });

    const presignJson = await presignRes.json();
    if (!presignRes.ok || !presignJson.success) {
      throw new Error(presignJson.error || 'Failed to generate secure upload credentials.');
    }

    const { uploadUrl, publicUrl, objectKey } = presignJson.data;

    // 3. Direct binary PUT to Cloudflare R2
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': optimized.mimeType
      },
      body: optimized.blob
    });

    if (!uploadRes.ok) {
      throw new Error(`Cloudflare R2 upload rejected with status: ${uploadRes.status}`);
    }

    return {
      publicUrl,
      storageKey: objectKey,
      width: optimized.width,
      height: optimized.height
    };
  },

  async uploadCourseVideo(
    file: File,
    courseId: string = 'general'
  ): Promise<{ publicUrl: string; storageKey: string }> {
    const contentType = file.type && file.type.startsWith('video/') ? file.type : 'video/mp4';
    const safeFilename = /\.(mp4|webm|mov|m4v)$/i.test(file.name)
      ? file.name
      : `${file.name || 'short-video'}.mp4`;

    const presignRes = await authenticatedFetch(`${API_BASE}/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        filename: safeFilename,
        contentType,
        size: file.size,
        isCover: false
      })
    });

    const presignJson = await presignRes.json();
    if (!presignRes.ok || !presignJson.success) {
      throw new Error(presignJson.error || 'Failed to generate video upload credentials.');
    }

    const { uploadUrl, publicUrl, objectKey } = presignJson.data;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Cloudflare R2 video upload rejected with status: ${uploadRes.status}`);
    }

    return {
      publicUrl,
      storageKey: objectKey
    };
  },

  // --------------------------------------------------------------------------
  // 6. AI TEACHING STUDIO TOOLS
  // --------------------------------------------------------------------------

  async buildLessonWithAI(payload: AILessonGenerationPayload): Promise<AILessonGenerationResponse> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/build-lesson`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate lesson with AI.');
    return json.data;
  },

  async generateQuestionsWithAI(payload: AIQuestionGenerationPayload): Promise<AIQuestionGenerationResponse> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/generate-questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate questions with AI.');
    return json.data;
  },

  async improveContentWithAI(text: string, instruction?: string): Promise<{ improved_text: string; summary_of_changes?: string }> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/improve-content`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, instruction })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to improve text.');
    return json.data;
  },

  async generateCoursePlanWithAI(payload: AICoursePlanPayload): Promise<AICoursePlanResponse> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/generate-course-plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate course plan with AI.');
    return json.data;
  },

  async generateStructuredLessonWithAI(payload: AIStructuredLessonPayload): Promise<AIStructuredLessonResponse> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/generate-structured-lesson`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate structured lesson with AI.');
    return json.data;
  },

  // --------------------------------------------------------------------------
  // 7. STUDENT INTERACTIVE LEARNING & TELEMETRY
  // --------------------------------------------------------------------------

  async getClassroomCourses(classroomId: string): Promise<CourseClassroomAssignment[]> {
    const res = await authenticatedFetch(`/api/classes/${classroomId}/courses`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch classroom courses.');
    return json.courses || [];
  },

  async recordStudentProgress(payload: {
    course_id: string;
    classroom_id: string;
    episode_id: string;
    score?: number;
    max_score?: number;
    time_spent_seconds?: number;
    question_attempts?: Array<Record<string, any>>;
  }) {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/student/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to record progress.');
    return json;
  },

  async recordQuestionAttempt(payload: {
    course_id: string;
    classroom_id: string;
    episode_id: string;
    question_id: string;
    student_answer: string;
    is_correct: boolean;
    points_awarded?: number;
    skill?: string;
    concept?: string;
    difficulty?: string;
    word_count?: number;
    submission_status?: string;
    ai_likelihood_percentage?: number;
    ai_confidence?: string;
    assessment_status?: string;
    ai_explanation?: string;
    ai_provider?: string;
    ai_model?: string;
    evaluation_feedback?: Record<string, any>;
    typing_telemetry?: Record<string, any>;
    evaluated_at?: string;
    flagged_for_review?: boolean;
  }) {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/student/attempt`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const err: any = new Error(json.error || 'Failed to record question attempt.');
      err.already_answered = Boolean(json.already_answered);
      err.attempt = json.attempt;
      throw err;
    }
    return json;
  },

  async getStudentQuestionAttempts(courseId: string, classroomId?: string, episodeId?: string) {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId);
    if (classroomId) params.append('classroom_id', classroomId);
    if (episodeId) params.append('episode_id', episodeId);

    const res = await authenticatedFetch(`${API_BASE}/student/attempts?${params.toString()}`, {
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) return [];
    return json.attempts || [];
  },

  async saveVideoProgress(payload: {
    course_id: string;
    classroom_id?: string;
    episode_id: string;
    video_key?: string;
    watched_seconds: number;
    duration_seconds: number;
    watched_percent: number;
    watched_segments: Array<[number, number]>;
    max_allowed_position?: number;
    is_completed?: boolean;
  }) {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/student/video-progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save video progress.');
    }
    return json.video_progress;
  },

  async getVideoProgress(courseId: string, episodeId?: string) {
    const headers = await getAuthHeader();
    const params = new URLSearchParams({ course_id: courseId });
    if (episodeId) params.append('episode_id', episodeId);

    const res = await authenticatedFetch(`${API_BASE}/student/video-progress?${params.toString()}`, {
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) return [];
    return json.progress || [];
  },

  async recordLearningEvent(payload: {
    course_id: string;
    classroom_id?: string | null;
    episode_id?: string | null;
    event_type: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const headers = await getAuthHeader();
      const res = await authenticatedFetch(`${API_BASE}/student/learning-event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      return json;
    } catch {
      return { success: false };
    }
  },

  async evaluateEssay(payload: {
    course_id?: string;
    classroom_id?: string;
    episode_id?: string;
    question_id?: string;
    question_text: string;
    student_response: string;
    image_url?: string;
    lesson_context?: string;
    min_words?: number;
    max_words?: number;
    evaluation_criteria?: string[];
    typing_telemetry?: Record<string, any>;
    ai_threshold?: number;
  }): Promise<EssayEvaluationResult> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/essay-evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const err: any = new Error(json.error || 'Failed to evaluate essay response.');
      err.provider_unavailable = Boolean(json.provider_unavailable);
      err.duplicate_submission = Boolean(json.duplicate_submission || json.already_answered);
      err.statusCode = res.status;
      throw err;
    }
    return json.evaluation;
  },

  async getFlaggedWritingSubmissions(courseId: string) {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/flagged-submissions`, {
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) return [];
    return json.submissions || [];
  },

  async reviewFlaggedWritingSubmission(
    courseId: string,
    submissionId: string,
    payload: {
      action: 'approve' | 'reject' | 'allow_retry';
      approved_points?: number;
      review_notes?: string;
    }
  ) {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(
      `${API_BASE}/courses/${courseId}/flagged-submissions/${submissionId}/review`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to review submission.');
    }
    return json;
  },

  async evaluateQuestionAnswer(payload: {
    question_text: string;
    student_answer: string;
    expected_answer?: string;
    acceptable_answers?: string[];
    evaluation_criteria?: string[];
    passage?: string;
    max_score?: number;
    wh_type?: string;
    cefr_level?: string;
  }): Promise<{
    score: number;
    maxScore: number;
    correct: boolean;
    feedback: string;
    languageFeedback?: string | null;
  }> {
    const headers = await getAuthHeader();
    const res = await authenticatedFetch(`${API_BASE}/ai/evaluate-answer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to evaluate answer.');
    }
    return json.evaluation;
  }
};
