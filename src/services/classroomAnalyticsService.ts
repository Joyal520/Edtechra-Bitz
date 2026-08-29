// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLASSROOM ANALYTICS CLIENT SERVICE
// Client service for fetching deterministic classroom and student analytics.
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  ClassroomAnalyticsSummary,
  AnalyticsOptions
} from '@/types/classroomAnalytics';

export class ClassroomAnalyticsService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  /**
   * Retrieves deterministic classroom analytics (overview, student metrics, activities, topics, trends)
   * @param classroomId - Target classroom UUID
   * @param options - Optional period days, start/end dates
   */
  async getClassroomAnalytics(
    classroomId: string,
    options: AnalyticsOptions = {}
  ): Promise<ClassroomAnalyticsSummary> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();

    if (options.periodDays) {
      params.append('periodDays', options.periodDays.toString());
    }
    if (options.startDate) {
      params.append('startDate', options.startDate);
    }
    if (options.endDate) {
      params.append('endDate', options.endDate);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/classes/${classroomId}/analytics${queryStr}`, {
      headers
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load classroom analytics.');
    }

    return data.analytics;
  }
}

export const classroomAnalyticsService = new ClassroomAnalyticsService();
