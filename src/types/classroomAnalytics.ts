// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLASSROOM ANALYTICS ENGINE TYPE DEFINITIONS
// Phase 2 Type Specifications for Classroom, Student, Topic, and Trend Analytics.
// ============================================================================

export type DataConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export type PerformanceCategory =
  | 'HIGH_PERFORMER'
  | 'IMPROVING'
  | 'NEEDS_SUPPORT'
  | 'AT_RISK'
  | 'INSUFFICIENT_DATA';

export type EngagementLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE';

export type ActivityType = 'assignment' | 'exam' | 'live_quiz' | 'ocr' | 'ai_challenge';

export interface UnifiedLearningEvent {
  id: string;
  classroom_id: string;
  student_id: string;
  activity_id: string;
  activity_type: ActivityType | string;
  activity_title: string;
  topic: string | null;
  category: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  completed_at: string;
  attempt_number: number;
  source_table: string;
  source_id: string;
  metadata?: Record<string, any>;
}

export interface StudentAnalyticsRecord {
  studentId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  totalEvents: number;
  averagePercentage: number | null;
  strongResultsCount: number;
  weakResultsCount: number;
  mostRecentActivity: {
    completedAt: string;
    title: string;
    activityType: string;
    percentage: number | null;
  } | null;
  recentAveragePercentage: number | null;
  previousAveragePercentage: number | null;
  scoreChangePercentagePoints: number | null;
  activityFrequency: {
    eventsPerWeek: number;
    activeDaysCount: number;
  };
  engagementIndicator: EngagementLevel;
  performanceCategory: PerformanceCategory;
  performanceCategoryLabel: string;
  confidence: DataConfidenceLevel;
}

export interface ActivityTypeAnalytics {
  activityType: ActivityType | string;
  label: string;
  eventCount: number;
  averagePercentage: number | null;
  strongResultsCount: number;
  weakResultsCount: number;
  participatingStudentsCount: number;
  participationRate: number;
  mostRecentActivityAt: string | null;
  confidence: DataConfidenceLevel;
}

export interface TopicAnalyticsRecord {
  topic: string;
  category: string;
  eventCount: number;
  averagePercentage: number | null;
  participatingStudentsCount: number;
  scoreChangePercentagePoints: number | null;
  status: 'strong' | 'weak' | 'improving' | 'declining' | 'steady' | 'insufficient_data';
  confidence: DataConfidenceLevel;
}

export interface TrendComparisonResult {
  isAvailable: boolean;
  periodDays: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  currentScoreAverage: number | null;
  previousScoreAverage: number | null;
  scoreChangePercentagePoints: number | null;
  currentEventCount: number;
  previousEventCount: number;
  activityCountChange: number;
  activityPercentageChange: number | null;
  currentActiveStudents: number;
  previousActiveStudents: number;
  participationChange: number;
  confidence: DataConfidenceLevel;
  reason?: string;
}

export interface ClassroomAnalyticsSummary {
  classroom: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    teacherId: string;
  };
  overview: {
    totalStudents: number;
    activeStudents: number;
    totalLearningEvents: number;
    completedActivitiesCount: number;
    averagePercentage: number | null;
    strongResultsCount: number;
    weakResultsCount: number;
    completionRate: number | null;
    confidence: DataConfidenceLevel;
  };
  recentActivity: Array<{
    id: string;
    studentId: string;
    studentName: string;
    activityType: string;
    activityTitle: string;
    topic: string | null;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    completedAt: string;
  }>;
  students: StudentAnalyticsRecord[];
  activityBreakdown: Record<string, ActivityTypeAnalytics>;
  topics: TopicAnalyticsRecord[];
  trends: TrendComparisonResult;
  dataConfidence: DataConfidenceLevel;
  calculatedAt: string;
}

export interface AnalyticsOptions {
  periodDays?: number;
  startDate?: string;
  endDate?: string;
  minEventsForHighConfidence?: number;
  strongScoreThreshold?: number;
  weakScoreThreshold?: number;
}
