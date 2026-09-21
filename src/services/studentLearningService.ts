// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: STUDENT MY LEARNING SERVICE
// Personal student results, performance, corrected work, progress & achievements
// ============================================================================

import { supabase } from '@/lib/supabase';

export interface StudentTaskResult {
  id: string;
  title: string;
  score: number | null;
  max_score: number;
  percentage: number | null;
  status: string;
  teacher_feedback?: string | null;
  submitted_at: string;
  completed_at?: string | null;
  is_ai_graded?: boolean;
  r2_result_path?: string | null;
  skills?: string[];
  grammar_error_count?: number;
  spelling_error_count?: number;
  writing_evaluation?: any | null;
}

export interface StudentQuizResult {
  id: string;
  title: string;
  score: number;
  total_questions: number;
  correct_count: number;
  rank?: number | null;
  percentage: number;
  points_awarded?: number;
  completed_at: string;
}

export interface StudentExamResult {
  id: string;
  title: string;
  score: number;
  total_marks: number;
  percentage: number;
  grade?: string | null;
  passed?: boolean | null;
  status: string;
  report_r2_key?: string | null;
  submitted_at: string;
}

export interface StudentCompetitionResult {
  id: string;
  title: string;
  score: number;
  max_score: number;
  percentage: number;
  status: string;
  feedback?: string | null;
  submitted_at: string;
}

export interface StudentCorrectedWorkItem {
  id: string;
  title: string;
  source_type: 'writing_task' | 'ocr_handwritten' | 'assignment' | 'challenge' | string;
  work_type: 'writing' | 'handwritten' | 'document' | string;
  score?: number | null;
  max_score?: number;
  percentage?: number | null;
  feedback?: string | null;
  performance?: string | null;
  breakdown?: any;
  text_response?: string | null;
  content_text?: string | null;
  original_text?: string | null;
  corrected_work?: string | null;
  mistakes?: Array<{ original: string; correction: string; explanation?: string }>;
  corrections?: string[];
  strengths?: string[];
  grammar_errors?: Array<{ text: string; suggestion: string; rule?: string }>;
  spelling_errors?: Array<{ text: string; suggestion: string }>;
  feedback_metadata?: any;
  ai_evaluation_metadata?: any;
  original_r2_key?: string | null;
  original_url?: string | null;
  corrected_r2_key?: string | null;
  corrected_url?: string | null;
  r2_result_path?: string | null;
  date: string;
}

export interface StudentTopicProgress {
  topic: string;
  average_percentage: number;
  activities_count: number;
  status: 'strong' | 'developing' | 'needs_practice';
}

export interface StudentAchievementItem {
  id: string;
  title: string;
  description: string;
  category: 'points' | 'rank' | 'quiz' | 'writing' | 'milestone' | string;
  icon: string;
  earned: boolean;
}

export interface StudentPerformanceSummary {
  overall_percentage: number | null;
  recent_score: number | null;
  activities_completed: number;
  learning_status: string;
  has_data: boolean;
}

export interface StudentLearningResponse {
  student: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  classroom: {
    id: string;
    title: string;
    subject: string;
    grade: string;
  };
  performance: StudentPerformanceSummary;
  results: {
    tasks: StudentTaskResult[];
    quizzes: StudentQuizResult[];
    exams: StudentExamResult[];
    competitions: StudentCompetitionResult[];
  };
  corrected_work: StudentCorrectedWorkItem[];
  topics: StudentTopicProgress[];
  achievements: {
    points: number;
    rank: number | null;
    items: StudentAchievementItem[];
  };
}

class StudentLearningService {
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
   * Fetches authoritative personal student learning data for classroom
   */
  async getMyLearningData(classroomId: string): Promise<{ data?: StudentLearningResponse; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/${classroomId}/my-learning?_t=${Date.now()}`, {
        headers
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to load learning data' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Network error retrieving learning data' };
    }
  }

  /**
   * Retrieves signed R2 download/preview URL for student work
   */
  async getPresignedFileUrl(classroomId: string, objectKey: string): Promise<string | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(
        `/api/classes/${classroomId}/my-learning/view-file?key=${encodeURIComponent(objectKey)}`,
        { headers }
      );

      const json = await res.json();
      if (res.ok && json.success && json.data?.downloadUrl) {
        return json.data.downloadUrl;
      }
      return null;
    } catch (err) {
      console.error('[StudentLearning] Error fetching presigned URL:', err);
      return null;
    }
  }

  /**
   * Retrieves full detailed evaluation JSON document from Cloudflare R2
   */
  async getEvaluationJson(classroomId: string, r2KeyOrSubmissionId: { key?: string; submissionId?: string }): Promise<any | null> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      if (r2KeyOrSubmissionId.key) params.set('key', r2KeyOrSubmissionId.key);
      if (r2KeyOrSubmissionId.submissionId) params.set('submissionId', r2KeyOrSubmissionId.submissionId);

      const res = await fetch(
        `/api/classes/${classroomId}/my-learning/evaluation-json?${params.toString()}`,
        { headers }
      );

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.error('[StudentLearning] Error fetching evaluation JSON from R2:', err);
      return null;
    }
  }
}

export const studentLearningService = new StudentLearningService();
