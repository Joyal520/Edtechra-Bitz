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
  studentId?: string;
  student_ref: string;
  issue: string;
  average_score?: number | null;
  trend?: string;
  main_weakness?: string;
  recent_evidence?: string;
  suggested_support?: string;
  recommended_action?: string;
  attempts?: number;
  completion_rate?: number;
}

export interface ActionSpec {
  action_type: 'create_revision_quiz' | 'assign_practice' | 'schedule_review' | 'group_students';
  action_label: string;
  target_topic?: string;
  target_students?: string[];
}

export interface StructuredRecommendation {
  observation: string;
  analysis: string;
  recommendation: string;
  action_spec?: ActionSpec;
}

export interface ClassHealthSummary {
  classAverage: number | null;
  participationRate: number;
  completionRate: number;
  assessmentActivityCount: number;
  improvingCount: number;
  improvingStudents: Array<{
    studentId: string;
    name: string;
    average: number | null;
    change: number | null;
  }>;
  strugglingCount: number;
  strugglingStudents: Array<{
    studentId: string;
    name: string;
    average: number | null;
    trend: number | null;
    weakestArea?: string;
  }>;
}

export interface TeachingIntelligenceData {
  summary: string;
  teach_next: TeachNextItem[];
  class_strengths: ClassStrengthItem[];
  areas_to_improve: AreaToImproveItem[];
  students_needing_attention: StudentAttentionItem[];
  recommended_actions: Array<StructuredRecommendation | string>;
  has_sufficient_data?: boolean;
}

export interface TopTopicItem {
  topic: string;
  averageScore: number;
  eventsCount: number;
  change?: number | null;
  status: string;
}

export interface StudentAssessmentEvent {
  id: string;
  activityId: string;
  activityType: 'live_quiz' | 'exam' | 'assignment' | 'ocr' | 'ai_challenge' | string;
  activityTitle: string;
  topic: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  completedAt: string;
  metadata?: any;
}

export interface StudentAIAssessment {
  has_sufficient_data: boolean;
  doing_well: string;
  where_struggling: string;
  evidence: string;
  next_steps: string;
  ai_provider?: string;
  message?: string;
}

export interface StudentIntelligenceDetail {
  studentId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  totalEvents: number;
  attempts: number;
  averagePercentage: number | null;
  accuracyPercentage: number | null;
  completionRate: number;
  strongResultsCount: number;
  weakResultsCount: number;
  strongAreas: Array<{ topic: string; average: number; count: number }>;
  weakAreas: Array<{ topic: string; average: number; count: number }>;
  activityBreakdown: {
    live_quiz: { attempts: number; averageScore: number | null; highestScore?: number | null; recentScore?: number | null };
    exam: { attempts: number; averageScore: number | null; passedCount: number; failedCount: number };
    assignment: { attempts: number; averageScore: number | null; completedCount: number };
    ocr: { attempts: number; averageScore: number | null };
    ai_challenge: { attempts: number; averageScore: number | null };
  };
  assessmentHistory: StudentAssessmentEvent[];
  mostRecentActivity?: {
    completedAt: string;
    title: string;
    activityType: string;
    percentage: number | null;
  } | null;
  recentAveragePercentage: number | null;
  previousAveragePercentage: number | null;
  scoreChangePercentagePoints: number | null;
  trend: 'IMPROVING' | 'DECLINING' | 'STEADY';
  engagementIndicator: 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE';
  performanceCategory: string;
  performanceCategoryLabel: string;
  confidence: string;
  ai_assessment?: StudentAIAssessment;
}

export interface TeacherChatMessage {
  role: 'teacher' | 'assistant' | 'user' | 'model';
  content: string;
  timestamp?: string;
}

export interface TeacherChatResponse {
  success: boolean;
  reply: string;
  ai_provider?: string;
  error?: string;
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
    overall_score: number | null;
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
  class_health?: ClassHealthSummary;
  top_strengths?: TopTopicItem[];
  top_weaknesses?: TopTopicItem[];
  topic_performance: TopicPerformance[];
  students_needing_attention: StudentAttentionItem[];
  students?: StudentIntelligenceDetail[];
  data_hash: string;
  computed_at: string;
}

export interface TeachingIntelligenceResponse {
  success: boolean;
  cached?: boolean;
  has_analysis?: boolean;
  metrics: ClassroomMetricsSummary;
  intelligence: TeachingIntelligenceData | null;
  ai_provider?: string;
  model?: string;
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

async function parseApiResponse<T = any>(res: Response, fallbackErrorMessage: string): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (_e) {
    console.error(`[TeachingIntelligenceClient] Non-JSON API response (${res.status}):`, text.slice(0, 300));
    throw new Error(
      res.status >= 500
        ? 'The server encountered an issue processing intelligence. Please try refreshing in a moment.'
        : fallbackErrorMessage
    );
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || fallbackErrorMessage);
  }
  return data as T;
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

    return await parseApiResponse<TeachingIntelligenceResponse>(res, 'Failed to load teaching intelligence.');
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

    return await parseApiResponse<TeachingIntelligenceResponse>(res, 'Failed to refresh teaching intelligence.');
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

    return await parseApiResponse(res, 'Failed to generate 30-Day performance report.');
  }

  /**
   * Lists previous 30-day reports with Cloudflare R2 download links
   */
  async getReports(classroomId: string): Promise<ThirtyDayReportRecord[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/reports`, {
      headers
    });

    try {
      const data = await parseApiResponse<{ success: boolean; reports: ThirtyDayReportRecord[] }>(res, 'Failed to list reports.');
      return data.reports || [];
    } catch (_err) {
      return [];
    }
  }

  /**
   * Retrieves list of recent completed/active exams with calculated summary metrics
   */
  async getRecentExamReports(classroomId: string): Promise<RecentExamReportCard[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/recent-exams`, {
      headers
    });
    const data = await parseApiResponse<{ success: boolean; exams: RecentExamReportCard[] }>(res, 'Failed to load recent exam reports.');
    return data.exams || [];
  }

  /**
   * Retrieves comprehensive in-modal exam analysis
   */
  async getExamAnalysis(classroomId: string, examId: string, forceRefresh = false): Promise<ExamDetailedAnalysisData> {
    const headers = await this.getAuthHeaders();
    const query = forceRefresh ? '?refresh=true' : '';
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/exams/${examId}/analysis${query}`, {
      headers
    });
    const data = await parseApiResponse<{ success: boolean; analysis: ExamDetailedAnalysisData }>(res, 'Failed to load exam analysis.');
    return data.analysis;
  }

  /**
   * Triggers on-demand fresh AI analysis for a specific exam
   */
  async refreshExamAIAnalysis(classroomId: string, examId: string): Promise<ExamDetailedAnalysisData> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/exams/${examId}/ai-analysis`, {
      method: 'POST',
      headers
    });
    const data = await parseApiResponse<{ success: boolean; analysis: ExamDetailedAnalysisData }>(res, 'Failed to refresh exam AI analysis.');
    return data.analysis;
  }

  /**
   * Retrieves comprehensive student intelligence details and AI assessment
   */
  async getStudentIntelligence(
    classroomId: string,
    studentId: string,
    forceRefresh = false
  ): Promise<{ success: boolean; student: StudentIntelligenceDetail; ai_assessment: StudentAIAssessment }> {
    const headers = await this.getAuthHeaders();
    const query = forceRefresh ? '?refresh=true' : '';
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/students/${studentId}${query}`, {
      headers
    });
    return await parseApiResponse(res, 'Failed to load student intelligence.');
  }

  /**
   * Triggers fresh AI assessment for an individual student
   */
  async refreshStudentAIAssessment(
    classroomId: string,
    studentId: string
  ): Promise<{ success: boolean; student: StudentIntelligenceDetail; ai_assessment: StudentAIAssessment }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/students/${studentId}/ai-assessment`, {
      method: 'POST',
      headers
    });
    return await parseApiResponse(res, 'Failed to refresh student AI assessment.');
  }

  /**
   * Sends inquiry to the AI Teacher Assistant grounded in real classroom records
   */
  async sendTeacherChatMessage(
    classroomId: string,
    message: string,
    conversationHistory: TeacherChatMessage[] = []
  ): Promise<TeacherChatResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/classes/${classroomId}/teaching-intelligence/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ message, conversationHistory })
    });
    return await parseApiResponse<TeacherChatResponse>(res, 'Failed to communicate with AI Teacher Assistant.');
  }
}

export interface RecentExamReportCard {
  id: string;
  exam_id: string;
  exam_name: string;
  classroom_id: string;
  status: string;
  date: string;
  timeframe: string;
  total_marks: number;
  pass_marks: number;
  enrolled_students: number;
  completed_students: number;
  completion_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
  performance_indicator: 'Excellent' | 'Good' | 'Needs Attention' | 'Not Started';
}

export interface ExamSummaryStrip {
  total_students: number;
  completed_students: number;
  completion_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  passed_count: number;
  failed_count: number;
  total_marks: number;
  pass_marks: number;
}

export interface ExamScoreDistribution {
  passed_vs_failed: {
    passed: number;
    failed: number;
    pass_rate: number;
    fail_rate: number;
  };
  score_ranges: Array<{
    range: string;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
}

export interface ExamTopicPerformance {
  topic: string;
  score: number;
  questionsCount: number;
  status: 'strong' | 'moderate' | 'weak';
}

export interface ExamQuestionPerformance {
  questionId: string;
  questionText: string;
  questionType: string;
  topic: string;
  marks: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  status: 'strong' | 'moderate' | 'weak';
}

export interface ExamStudentPerformance {
  rank: number;
  student_id: string;
  student_name: string;
  email: string;
  avatar_url?: string | null;
  score: number;
  total_marks: number;
  percentage: number;
  grade: string;
  status: 'Pass' | 'Fail';
  submitted_at: string;
}

export interface ExamAIAnalysis {
  class_performance_summary: string;
  strongest_topics: string[];
  weakest_topics: Array<{
    topic: string;
    accuracy: number;
    misconception: string;
  }>;
  common_mistakes: string[];
  exceptional_performers: Array<{
    student_ref: string;
    score: number;
    highlight: string;
  }>;
  students_needing_attention: Array<{
    student_ref: string;
    score: number;
    issue: string;
    suggested_support: string;
  }>;
  recommended_revision_topics: string[];
  recommended_actions: Array<{
    type: 'reteach' | 'practice' | 'intervention';
    action: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  ai_provider?: string;
  cached?: boolean;
  updated_at?: string;
}

export interface ExamDetailedAnalysisData {
  exam: {
    id: string;
    title: string;
    description: string;
    subject: string;
    grade: string;
    total_marks: number;
    pass_marks: number;
    status: string;
    published_at: string;
    timeframe: string;
  };
  summary: ExamSummaryStrip;
  distribution: ExamScoreDistribution;
  topic_performance: ExamTopicPerformance[];
  question_performance: ExamQuestionPerformance[];
  students: ExamStudentPerformance[];
  ai_analysis: ExamAIAnalysis;
}

export const teachingIntelligenceService = new TeachingIntelligenceService();

