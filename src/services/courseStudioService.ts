// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO CLIENT SERVICE
// Complete API client for Teacher Course Studio, AI Lesson & Question Generation,
// R2 Visual Compression Uploads, Classroom Assignments, and Learning Telemetry.
// ============================================================================

import { supabase } from '@/lib/supabase';
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

async function getAuthHeader(): Promise<{ Authorization: string; 'Content-Type': string }> {
  let token = '';
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    token = sessionData?.session?.access_token || '';
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export const courseStudioService = {
  // --------------------------------------------------------------------------
  // 1. COURSE CRUD
  // --------------------------------------------------------------------------

  async getCourses(): Promise<Course[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses`, { headers });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch courses.');
    }
    return json.courses || [];
  },

  async getCourse(courseId: string): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}`, { headers });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch course details.');
    }
    return json.course;
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
    const res = await fetch(`${API_BASE}/courses`, {
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
    }>
  ): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update course.');
    }
    return json.course;
  },

  async deleteCourse(courseId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete course.');
    }
  },

  async duplicateCourse(courseId: string): Promise<Course> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/duplicate`, {
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
    const res = await fetch(`${API_BASE}/courses/${courseId}/units`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create unit.');
    return json.unit;
  },

  async updateUnit(courseId: string, unitId: string, updates: Partial<{ title: string; description: string; order_index: number }>): Promise<CourseUnit> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/units/${unitId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update unit.');
    return json.unit;
  },

  async deleteUnit(courseId: string, unitId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/units/${unitId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete unit.');
  },

  async createEpisode(
    courseId: string,
    payload: { unit_id: string; title: string; episode_type?: string; order_index?: number; estimated_minutes?: number }
  ): Promise<CourseEpisode> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create episode.');
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
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update episode.');
    return json.episode;
  },

  async reorderEpisodes(courseId: string, unitId: string, episodeIds: string[]): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes/reorder`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ unit_id: unitId, episode_ids: episodeIds })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to reorder episodes.');
  },

  async manuallyUnlockEpisode(courseId: string, episodeId: string): Promise<CourseEpisode> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}/unlock`, {
      method: 'POST',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to unlock episode.');
    return json.episode;
  },

  async deleteEpisode(courseId: string, episodeId: string): Promise<void> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}`, {
      method: 'DELETE',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to delete episode.');
  },

  // --------------------------------------------------------------------------
  // 3. CONTENT BLOCKS & QUESTIONS
  // --------------------------------------------------------------------------

  async saveEpisodeBlocks(courseId: string, episodeId: string, blocks: Partial<CourseBlock>[]): Promise<CourseBlock[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/episodes/${episodeId}/blocks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ blocks })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save blocks.');
    return json.blocks;
  },

  async saveEpisodeQuestions(courseId: string, episodeId: string, questions: Partial<CourseQuestion>[]): Promise<CourseQuestion[]> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ episode_id: episodeId, questions })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save questions.');
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
    }
  ): Promise<{ course: Course; assigned_count: number; assignments: CourseClassroomAssignment[] }> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/publish-and-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to publish & assign course.');
    return json;
  },

  async getCourseAnalytics(courseId: string): Promise<CourseAnalyticsSummary> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/courses/${courseId}/analytics`, { headers });
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

    // 2. Request presigned URL from backend
    const headers = await getAuthHeader();
    const presignRes = await fetch(`${API_BASE}/presign-upload`, {
      method: 'POST',
      headers,
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

  // --------------------------------------------------------------------------
  // 6. AI TEACHING STUDIO TOOLS
  // --------------------------------------------------------------------------

  async buildLessonWithAI(payload: AILessonGenerationPayload): Promise<AILessonGenerationResponse> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/ai/build-lesson`, {
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
    const res = await fetch(`${API_BASE}/ai/generate-questions`, {
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
    const res = await fetch(`${API_BASE}/ai/improve-content`, {
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
    const res = await fetch(`${API_BASE}/ai/generate-course-plan`, {
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
    const res = await fetch(`${API_BASE}/ai/generate-structured-lesson`, {
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
    const headers = await getAuthHeader();
    const res = await fetch(`/api/classes/${classroomId}/courses`, { headers });
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
  }) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/student/progress`, {
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
  }) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/student/attempt`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to record question attempt.');
    return json;
  },

  async getStudentQuestionAttempts(courseId: string, classroomId?: string, episodeId?: string) {
    const headers = await getAuthHeader();
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId);
    if (classroomId) params.append('classroom_id', classroomId);
    if (episodeId) params.append('episode_id', episodeId);

    const res = await fetch(`${API_BASE}/student/attempts?${params.toString()}`, {
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) return [];
    return json.attempts || [];
  },

  async evaluateEssay(payload: {
    question_text: string;
    student_response: string;
    image_url?: string;
    lesson_context?: string;
    min_words?: number;
    max_words?: number;
    evaluation_criteria?: string[];
  }): Promise<EssayEvaluationResult> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/essay-evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to evaluate essay response.');
    }
    return json.evaluation;
  }
};
