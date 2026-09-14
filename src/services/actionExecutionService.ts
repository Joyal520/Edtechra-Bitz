// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION EXECUTION SERVICE (PHASE 2B)
// Client service for inspecting, approving, scheduling, executing, and auditing
// AI classroom actions generated from Teaching Plans.
// ============================================================================

import { supabase } from '@/lib/supabase';

export type ActionType =
  | 'create_diagnostic_exam'
  | 'create_learning_resource'
  | 'post_announcement'
  | 'create_live_quiz'
  | 'schedule_live_quiz';

export type ActionStatus =
  | 'pending'
  | 'approved'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ActionPriority = 'high' | 'medium' | 'low';

export interface AIAction {
  id: string;
  teaching_plan_id?: string | null;
  classroom_id: string;
  teacher_id: string;
  action_type: ActionType;
  title: string;
  description: string;
  reason: string;
  priority: ActionPriority;
  payload: Record<string, any>;
  result_payload?: Record<string, any> | null;
  status: ActionStatus;
  requires_approval: boolean;
  scheduled_for?: string | null;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  executed_at?: string | null;
}

export interface ActionExecutionResponse {
  success: boolean;
  action: AIAction;
  result?: any;
  executed?: boolean;
  isDuplicate?: boolean;
  error?: string;
}

class ActionExecutionService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return { 'Content-Type': 'application/json' };
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    };
  }

  /**
   * Fetches classroom actions with optional planId or status filtering
   */
  async getActions(classroomId: string, planId?: string, status?: ActionStatus): Promise<AIAction[]> {
    try {
      const headers = await this.getAuthHeaders();
      const params = new URLSearchParams();
      if (planId) params.append('plan_id', planId);
      if (status) params.append('status', status);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/classes/${classroomId}/actions${qs}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch actions (${res.status})`);
      }

      const data = await res.json();
      return data.actions || [];
    } catch (err: any) {
      console.warn('[ActionExecutionService] API getActions error, attempting Supabase direct fallback:', err.message);
      if (!supabase) return [];

      try {
        let query = supabase
          .from('ai_actions')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('created_at', { ascending: false });

        if (planId) query = query.eq('teaching_plan_id', planId);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        return (data as AIAction[]) || [];
      } catch (dbErr) {
        console.error('[ActionExecutionService] Supabase fallback error:', dbErr);
        return [];
      }
    }
  }

  /**
   * Converts teaching plan recommendations into actionable records
   */
  async createActionsFromPlan(classroomId: string, plan: any): Promise<AIAction[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/create-from-plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan,
        plan_id: plan.id
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create actions from teaching plan.');
    }

    const data = await res.json();
    return data.actions || [];
  }

  /**
   * Creates an ad-hoc action
   */
  async createAction(classroomId: string, actionData: Partial<AIAction>): Promise<{ action: AIAction; isDuplicate?: boolean }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(actionData)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create action.');
    }

    return await res.json();
  }

  /**
   * Approves an action (with optional executeNow flag)
   */
  async approveAction(classroomId: string, actionId: string, executeNow: boolean = false): Promise<ActionExecutionResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/${actionId}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ execute_now: executeNow })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to approve action.');
    }

    return await res.json();
  }

  /**
   * Executes an action immediately
   */
  async executeAction(classroomId: string, actionId: string): Promise<ActionExecutionResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/${actionId}/execute`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to execute action.');
    }

    return await res.json();
  }

  /**
   * Edits action properties (title, description, schedule, payload)
   */
  async editAction(classroomId: string, actionId: string, updates: Partial<AIAction>): Promise<AIAction> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/${actionId}/edit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to edit action.');
    }

    const data = await res.json();
    return data.action;
  }

  /**
   * Cancels/rejects an action
   */
  async rejectAction(classroomId: string, actionId: string): Promise<AIAction> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/${actionId}/reject`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to reject action.');
    }

    const data = await res.json();
    return data.action;
  }

  /**
   * Retries a failed action
   */
  async retryAction(classroomId: string, actionId: string): Promise<ActionExecutionResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/actions/${actionId}/retry`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to retry action.');
    }

    return await res.json();
  }
}

export const actionExecutionService = new ActionExecutionService();
