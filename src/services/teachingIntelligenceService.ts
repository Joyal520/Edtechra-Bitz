// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TEACHING INTELLIGENCE CLIENT SERVICE
// ============================================================================

import { supabase } from '@/lib/supabase';

export interface TopicPerformance {
  topic: string;
  score: number;
  change: number;
  status: 'strong' | 'weak' | 'steady' | 'improving' | 'declining';
}

export interface TeachNextItem {
  topic: string;
  current_performance: number;
  why: string;
  recommended_action: string;
}

export interface ClassStrengthItem {
  title: string;
  detail: string;
}

export interface AreaToImproveItem {
  title: string;
  detail: string;
}

export interface StudentAttentionItem {
  student_ref: string;
  issue: string;
  average_score?: number;
  suggested_support: string;
}

export interface TeachingIntelligenceData {
  summary: string;
  teach_next: TeachNextItem[];
  class_strengths: ClassStrengthItem[];
  areas_to_improve: AreaToImproveItem[];
  students_needing_attention: StudentAttentionItem[];
  recommended_actions: string[];
}

export interface ClassroomMetricsSummary {
  classroom: {
    id: string;
    title: string;
    subject: string;
    grade: string;
  };
  class_summary: {
    total_students: number;
    active_students: number;
    overall_score: number;
    score_change: number;
    task_completion_rate: number;
    engagement_rate: number;
    assessments_count: {
      tasks: number;
      quizzes: number;
      exams: number;
      ocr_assessments: number;
      competitions: number;
    };
  };
  topic_performance: TopicPerformance[];
  students_needing_attention: StudentAttentionItem[];
  data_hash: string;
  computed_at: string;
}

export interface TeachingIntelligenceResponse {
  success: boolean;
  cached?: boolean;
  metrics: ClassroomMetricsSummary;
  intelligence: TeachingIntelligenceData;
  ai_provider?: string;
  updated_at: string;
  error?: string;
}

export interface ThirtyDayReportRecord {
  id: string;
  classroom_id: string;
  report_period: string;
  title: string;
  storage_key: string;
  file_name: string;
  download_url: string;
  public_url: string;
  created_at: string;
  report_data_json?: any;
}

class TeachingIntelligenceService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  /**
   * Retrieves teaching intelligence for classroom (uses cache if unchanged)
   */
  async getTeachingIntelligence(classroomId: string, forceRefresh = false): Promise<TeachingIntelligenceResponse> {
    const headers = await this.getAuthHeaders();
    const query = forceRefresh ? '?refresh=true' : '';
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence${query}`, {
      headers
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load teaching intelligence.');
    }
    return data;
  }

  /**
   * Forces fresh AI analysis for classroom
   */
  async refreshTeachingIntelligence(classroomId: string): Promise<TeachingIntelligenceResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/refresh`, {
      method: 'POST',
      headers
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to refresh teaching intelligence.');
    }
    return data;
  }

  /**
   * Generates comprehensive 30-Day performance report and uploads PDF to Cloudflare R2
   */
  async generateThirtyDayReport(classroomId: string, period = 'Last 30 Days'): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ period })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate 30-Day performance report.');
    }
    return data;
  }

  /**
   * Lists previous 30-day reports with Cloudflare R2 download links
   */
  async getReports(classroomId: string): Promise<ThirtyDayReportRecord[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/reports`, {
      headers
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return [];
    }
    return data.reports || [];
  }
}

export const teachingIntelligenceService = new TeachingIntelligenceService();
