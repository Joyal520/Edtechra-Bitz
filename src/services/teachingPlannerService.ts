// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI TEACHING PLANNER CLIENT SERVICE (PHASE 2A)
// ============================================================================

import { supabase } from '@/lib/supabase';

export interface LessonActivity {
  name: string;
  duration_minutes: number;
  description: string;
  grouping: 'whole_class' | 'pairs' | 'individual' | 'small_group';
}

export interface DailyLessonPlan {
  day: number;
  title: string;
  objectives: string[];
  lesson_focus: string;
  activities: LessonActivity[];
  assessment: string;
  homework: string;
}

export interface ClassProfileSummary {
  evidence_summary: string;
  strengths: string[];
  weaknesses: string[];
  considerations: string[];
  data_sufficiency: 'comprehensive' | 'moderate' | 'initial_diagnostic';
}

export interface DifferentiationPlan {
  support_students: string[];
  support_strategy: string;
  advanced_students: string[];
  extension_strategy: string;
}

export interface RecommendedPlanAction {
  type: 'diagnostic_exam' | 'revision_quiz' | 'practice_task' | 'resource_reading' | 'writing_challenge';
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TeachingPlan {
  id?: string;
  title: string;
  topic: string;
  learning_goal: string;
  learning_objectives: string[];
  class_profile: ClassProfileSummary;
  duration_days: number;
  lesson_duration_minutes: number;
  daily_plan: DailyLessonPlan[];
  differentiation: DifferentiationPlan;
  recommended_actions: RecommendedPlanAction[];
  success_criteria: string[];
}

export interface TeachingPlanInput {
  topic: string;
  learning_goal?: string;
  content?: string;
  level?: string;
  duration_days: number;
  lesson_duration_minutes?: number;
  teacher_notes?: string;
}

export interface SavedTeachingPlanRecord {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  topic: string;
  learning_goal: string;
  duration_days: number;
  lesson_duration_minutes: number;
  teacher_notes?: string;
  plan_json: TeachingPlan;
  classroom_snapshot?: any;
  status: 'draft' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface GeneratePlanResponse {
  success: boolean;
  plan: TeachingPlan;
  classroom_snapshot?: any;
  ai_provider?: string;
  model?: string;
  error?: string;
}

async function parseApiResponse<T = any>(res: Response, fallbackErrorMessage: string): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (_e) {
    console.error(`[TeachingPlannerClient] Non-JSON response (${res.status}):`, text.slice(0, 300));
    throw new Error(
      res.status >= 500
        ? 'The planner engine is experiencing heavy load. Please try again in a moment.'
        : fallbackErrorMessage
    );
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || fallbackErrorMessage);
  }
  return data as T;
}

class TeachingPlannerService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!supabase) return { 'Content-Type': 'application/json' };
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
    };
  }

  /**
   * Generates a personalized, evidence-grounded AI Teaching Plan
   */
  async generatePlan(classroomId: string, input: TeachingPlanInput): Promise<GeneratePlanResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    return await parseApiResponse<GeneratePlanResponse>(res, 'Failed to generate AI teaching plan.');
  }

  /**
   * Regenerates a single specific day of an existing Teaching Plan
   */
  async regenerateDay(
    classroomId: string,
    currentPlan: TeachingPlan,
    dayNumber: number,
    teacherInstructions: string
  ): Promise<TeachingPlan> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/regenerate-day`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPlan, dayNumber, teacherInstructions })
    });

    const data = await parseApiResponse<{ success: boolean; plan: TeachingPlan }>(res, 'Failed to regenerate day plan.');
    return data.plan;
  }

  /**
   * Saves or approves a Teaching Plan (status: draft or approved)
   */
  async savePlan(
    classroomId: string,
    planData: {
      id?: string;
      plan: TeachingPlan;
      status: 'draft' | 'approved' | 'archived';
      teacher_notes?: string;
      classroom_snapshot?: any;
    }
  ): Promise<{ success: boolean; plan: SavedTeachingPlanRecord }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify(planData)
    });

    return await parseApiResponse<{ success: boolean; plan: SavedTeachingPlanRecord }>(res, 'Failed to save teaching plan.');
  }

  /**
   * Lists all saved Teaching Plans for a classroom
   */
  async getPlans(classroomId: string): Promise<SavedTeachingPlanRecord[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/plans`, {
      headers
    });

    const data = await parseApiResponse<{ success: boolean; plans: SavedTeachingPlanRecord[] }>(res, 'Failed to load teaching plans.');
    return data.plans || [];
  }

  /**
   * Retrieves an individual plan by ID
   */
  async getPlanById(classroomId: string, planId: string): Promise<SavedTeachingPlanRecord | null> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/plans/${planId}`, {
      headers
    });

    const data = await parseApiResponse<{ success: boolean; plan: SavedTeachingPlanRecord }>(res, 'Failed to retrieve teaching plan.');
    return data.plan;
  }

  /**
   * Deletes or archives a teaching plan
   */
  async deletePlan(classroomId: string, planId: string): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-planner/plans/${planId}`, {
      method: 'DELETE',
      headers
    });

    const data = await parseApiResponse<{ success: boolean }>(res, 'Failed to delete teaching plan.');
    return !!data.success;
  }
}

export const teachingPlannerService = new TeachingPlannerService();
