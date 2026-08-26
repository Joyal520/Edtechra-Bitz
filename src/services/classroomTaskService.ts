import { supabase } from '@/lib/supabase';
import {
  ClassroomTask,
  TaskCategory,
  TaskContentBlock,
  TaskQuestion,
  TaskSettings,
  TaskSubmission
} from '@/types/classroomTask';

class ClassroomTaskClientService {
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
   * Teacher creates a new task (Assignment, Lesson, Practice, Activity, Resource)
   */
  async createTask(payload: {
    classroomId: string;
    title: string;
    subtitle?: string;
    instructions?: string;
    category: TaskCategory;
    points?: number;
    dueDate?: string | null;
    contentBlocks?: TaskContentBlock[];
    questions?: TaskQuestion[];
    attachmentUrls?: any[];
    settings?: Partial<TaskSettings>;
  }): Promise<{ data?: ClassroomTask; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/classes/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to create task' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Network error creating task' };
    }
  }

  /**
   * List tasks for a classroom with optional category filter
   */
  async getTasks(classroomId: string, category?: TaskCategory | 'all'): Promise<ClassroomTask[]> {
    try {
      const headers = await this.getAuthHeaders();
      const url = category && category !== 'all'
        ? `/api/classes/${classroomId}/tasks?category=${category}`
        : `/api/classes/${classroomId}/tasks`;

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.error('[ClassroomTask] getTasks error:', err);
      return [];
    }
  }

  /**
   * Get single task details for preview / interactive player
   */
  async getTask(taskId: string): Promise<ClassroomTask | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/tasks/${taskId}`, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Student submits task responses (executes server hybrid auto-grading)
   */
  async submitTask(
    taskId: string,
    payload: {
      studentAnswers?: Array<{ question_id: string; student_answer: any }>;
      textResponse?: string;
      fileUrls?: string[];
    }
  ): Promise<{ data?: TaskSubmission; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/tasks/${taskId}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to submit task' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Error submitting task' };
    }
  }

  /**
   * Teacher retrieves all student submissions for a task
   */
  async getSubmissions(taskId: string): Promise<TaskSubmission[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/tasks/${taskId}/submissions`, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Teacher overrides/adjusts student score
   */
  async overrideScore(
    submissionId: string,
    finalScore: number,
    reason?: string,
    teacherFeedback?: string
  ): Promise<{ data?: TaskSubmission; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/tasks/submissions/${submissionId}/override`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ finalScore, reason, teacherFeedback })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to override score' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Error overriding score' };
    }
  }
}

export const classroomTaskService = new ClassroomTaskClientService();
