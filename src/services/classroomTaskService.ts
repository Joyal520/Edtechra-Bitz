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
      imageBase64?: string;
      handwrittenImageBase64?: string;
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
   * Teacher or Student submits handwritten work for a task with OCR Vision AI evaluation
   */
  async submitHandwrittenTask(
    taskId: string,
    payload: {
      classroomId: string;
      studentId: string;
      studentName?: string;
      imageBase64: string;
      maxMarks?: number;
      category?: string;
      title?: string;
    }
  ): Promise<{ data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/classes/ocr-jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId,
          classroomId: payload.classroomId,
          studentId: payload.studentId,
          studentName: payload.studentName,
          imageBase64: payload.imageBase64,
          maxMarks: payload.maxMarks || 100,
          category: payload.category || 'Paragraph Writing',
          title: payload.title || ''
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to evaluate handwritten task work' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Network error evaluating handwritten work' };
    }
  }

  /**
   * Check existing submission for a specific student and task (Duplicate prevention)
   */
  async getStudentSubmission(taskId: string, studentId: string): Promise<TaskSubmission | null> {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:profiles!student_id (id, full_name, email, avatar_url)
        `)
        .eq('assignment_id', taskId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error || !data) return null;
      return data as TaskSubmission;
    } catch {
      return null;
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
