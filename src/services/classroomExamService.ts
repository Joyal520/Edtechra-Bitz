// ============================================================================
// EDTECHRA-BITZ: Classroom Exams Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  ClassroomExam,
  ClassroomExamResult,
  ClassroomExamQuestion
} from '@/types/classroom';
import { classroomPointsService } from './classroomPointsService';

class ClassroomExamService {
  private async getUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Retrieves all exams for a classroom
   */
  async getExamsByClassroom(classroomId: string): Promise<ClassroomExam[]> {
    if (!supabase || !classroomId) return [];
    const userId = await this.getUserId();

    try {
      const { data, error } = await supabase
        .from('classroom_exams')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const exams = data || [];
      if (exams.length === 0) return [];

      const examIds = exams.map((e) => e.id);

      // Fetch student results if logged in
      let resultsMap: Record<string, ClassroomExamResult> = {};
      if (userId) {
        const { data: results } = await supabase
          .from('classroom_exam_results')
          .select('*')
          .in('exam_id', examIds)
          .eq('student_id', userId);

        (results || []).forEach((r: any) => {
          resultsMap[r.exam_id] = r;
        });
      }

      return exams.map((exam) => {
        const myResult = resultsMap[exam.id] || null;
        const now = new Date();
        const start = exam.starts_at ? new Date(exam.starts_at) : null;
        const end = exam.ends_at ? new Date(exam.ends_at) : null;

        const isStarted = !start || now >= start;
        const isEnded = end && now > end;
        const canStart = !myResult && exam.status === 'published' && isStarted && !isEnded;

        return {
          ...exam,
          latest_result: myResult,
          can_start: canStart
        };
      });
    } catch (err) {
      console.error('[ClassroomExamService] getExamsByClassroom error:', err);
      return [];
    }
  }

  /**
   * Retrieves a single exam by ID
   */
  async getExamById(examId: string): Promise<ClassroomExam | null> {
    if (!supabase || !examId) return null;
    const userId = await this.getUserId();

    try {
      const { data: exam, error } = await supabase
        .from('classroom_exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (error || !exam) return null;

      let myResult: ClassroomExamResult | null = null;
      if (userId) {
        const { data: res } = await supabase
          .from('classroom_exam_results')
          .select('*')
          .eq('exam_id', examId)
          .eq('student_id', userId)
          .maybeSingle();
        myResult = res;
      }

      return {
        ...exam,
        latest_result: myResult,
        can_start: !myResult
      };
    } catch (err) {
      console.error('[ClassroomExamService] getExamById error:', err);
      return null;
    }
  }

  /**
   * Creates a new classroom exam
   */
  async createExam(payload: {
    classroom_id: string;
    title: string;
    description?: string;
    instructions?: string;
    duration_minutes?: number;
    total_marks?: number;
    pass_marks?: number;
    starts_at?: string | null;
    ends_at?: string | null;
    questions: ClassroomExamQuestion[];
  }): Promise<{ data?: ClassroomExam; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'Authentication required' };

    try {
      const totalMarks = payload.questions.reduce((acc, q) => acc + (q.marks || 10), 0) || payload.total_marks || 100;

      const { data, error } = await supabase
        .from('classroom_exams')
        .insert({
          classroom_id: payload.classroom_id,
          title: payload.title.trim(),
          description: (payload.description || '').trim(),
          instructions: (payload.instructions || '').trim(),
          duration_minutes: payload.duration_minutes || 30,
          total_marks: totalMarks,
          pass_marks: payload.pass_marks || Math.round(totalMarks * 0.4),
          starts_at: payload.starts_at || null,
          ends_at: payload.ends_at || null,
          questions: payload.questions,
          created_by: userId,
          status: 'published'
        })
        .select()
        .single();

      if (error) throw error;
      return { data };
    } catch (err: any) {
      console.error('[ClassroomExamService] createExam error:', err);
      return { error: err.message || 'Failed to create exam.' };
    }
  }

  /**
   * Submits student exam answers, calculates score, and records results
   */
  async submitExam(payload: {
    exam_id: string;
    classroom_id: string;
    answers: Record<string, string>; // questionId -> selectedOptionId
  }): Promise<{ data?: ClassroomExamResult; error?: string }> {
    if (!supabase) return { error: 'Supabase is not configured' };
    const userId = await this.getUserId();
    if (!userId) return { error: 'You must be logged in to submit an exam.' };

    try {
      const exam = await this.getExamById(payload.exam_id);
      if (!exam) return { error: 'Exam not found.' };

      // Calculate score
      let score = 0;
      exam.questions.forEach((q) => {
        const studentAns = payload.answers[q.id];
        if (studentAns && studentAns === q.correct_option_id) {
          score += Number(q.marks || 10);
        }
      });

      const totalMarks = exam.total_marks || 100;
      const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
      const passed = score >= (exam.pass_marks || 40);

      const { data, error } = await supabase
        .from('classroom_exam_results')
        .insert({
          exam_id: payload.exam_id,
          classroom_id: payload.classroom_id,
          student_id: userId,
          score,
          total_marks: totalMarks,
          percentage,
          passed,
          answers: payload.answers,
          feedback: passed ? 'Great job on passing the exam!' : 'Review the topics and try again next time.'
        })
        .select()
        .single();

      if (error) throw error;

      // Award points
      if (score > 0) {
        await classroomPointsService.awardPoints({
          classroom_id: payload.classroom_id,
          student_id: userId,
          points: score,
          reason: `Exam: ${exam.title}`,
          source_type: 'exam',
          source_id: payload.exam_id
        });
      }

      return { data };
    } catch (err: any) {
      console.error('[ClassroomExamService] submitExam error:', err);
      return { error: err.message || 'Failed to submit exam.' };
    }
  }

  /**
   * Retrieves all results for an exam (Teacher view)
   */
  async getExamResults(examId: string): Promise<ClassroomExamResult[]> {
    if (!supabase || !examId) return [];

    try {
      const { data, error } = await supabase
        .from('classroom_exam_results')
        .select(`
          *,
          student:profiles!student_id (id, full_name, email, avatar_url)
        `)
        .eq('exam_id', examId)
        .order('score', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[ClassroomExamService] getExamResults error:', err);
      return [];
    }
  }
}

export const classroomExamService = new ClassroomExamService();
