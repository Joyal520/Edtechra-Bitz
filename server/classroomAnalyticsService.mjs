// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DETERMINISTIC CLASSROOM ANALYTICS ENGINE (PHASE 2)
// High-performance, zero-mock, database-grounded statistical calculation service.
// Unifies and transforms events from public.v_classroom_learning_events.
// ============================================================================

export const ANALYTICS_CONFIG = {
  STRONG_SCORE_THRESHOLD: 75,
  WEAK_SCORE_THRESHOLD: 60,
  HIGH_PERFORMER_THRESHOLD: 80,
  NEEDS_SUPPORT_LOWER: 50,
  NEEDS_SUPPORT_UPPER: 70,
  AT_RISK_THRESHOLD: 50,
  IMPROVEMENT_DELTA_THRESHOLD: 5,
  DECLINE_DELTA_THRESHOLD: -5,
  MIN_EVENTS_HIGH_CONFIDENCE: 4,
  MIN_EVENTS_MEDIUM_CONFIDENCE: 2,
  DEFAULT_PERIOD_DAYS: 30
};

// ----------------------------------------------------------------------------
// 1. DATA CONFIDENCE EVALUATOR
// ----------------------------------------------------------------------------

/**
 * Deterministically evaluates the data confidence of a sample.
 * @param {number} eventsCount - Number of events with valid scores
 * @param {number} distinctActivitiesCount - Number of distinct activities
 * @param {number} distinctDatesCount - Number of distinct active days
 * @returns {'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'}
 */
export function evaluateDataConfidence(eventsCount = 0, distinctActivitiesCount = 1, distinctDatesCount = 1) {
  if (!eventsCount || eventsCount <= 0) {
    return 'INSUFFICIENT';
  }
  if (eventsCount >= ANALYTICS_CONFIG.MIN_EVENTS_HIGH_CONFIDENCE || (eventsCount >= 3 && distinctDatesCount >= 2)) {
    return 'HIGH';
  }
  if (eventsCount >= ANALYTICS_CONFIG.MIN_EVENTS_MEDIUM_CONFIDENCE) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// ----------------------------------------------------------------------------
// 2. STUDENT PERFORMANCE CLASSIFICATION
// ----------------------------------------------------------------------------

/**
 * Classifies student performance into standardized, documented categories.
 * @param {Object} params
 * @param {number|null} params.averagePercentage - Average percentage score
 * @param {number} params.validEventsCount - Count of scored events
 * @param {number|null} params.scoreChange - Score delta in percentage points
 * @param {string} params.confidence - Data confidence level
 * @returns {{ category: string, label: string }}
 */
export function classifyStudentPerformance({ averagePercentage, validEventsCount, scoreChange, confidence }) {
  if (validEventsCount === 0 || averagePercentage == null || confidence === 'INSUFFICIENT') {
    return {
      category: 'INSUFFICIENT_DATA',
      label: 'Insufficient data'
    };
  }

  // 1. High Performer (>= 80% with sufficient evidence)
  if (averagePercentage >= ANALYTICS_CONFIG.HIGH_PERFORMER_THRESHOLD) {
    return {
      category: 'HIGH_PERFORMER',
      label: 'High Performer'
    };
  }

  // 2. Improving (+5 percentage points or more with at least 2 events)
  if (scoreChange != null && scoreChange >= ANALYTICS_CONFIG.IMPROVEMENT_DELTA_THRESHOLD && validEventsCount >= 2) {
    return {
      category: 'IMPROVING',
      label: 'Improving'
    };
  }

  // 3. At Risk (< 50%)
  if (averagePercentage < ANALYTICS_CONFIG.AT_RISK_THRESHOLD) {
    return {
      category: 'AT_RISK',
      label: 'At Risk'
    };
  }

  // 4. Needs Support (50% - 69.99% or significant drop)
  if (averagePercentage < ANALYTICS_CONFIG.NEEDS_SUPPORT_UPPER || (scoreChange != null && scoreChange <= -10)) {
    return {
      category: 'NEEDS_SUPPORT',
      label: 'Needs Support'
    };
  }

  // 5. Steady Performer (70% - 79.99%)
  return {
    category: 'HIGH_PERFORMER',
    label: 'Steady Performer'
  };
}

// ----------------------------------------------------------------------------
// 3. STUDENT ENGAGEMENT INDICATOR
// ----------------------------------------------------------------------------

/**
 * Evaluates student engagement level based on recency and frequency.
 * @param {Object} params
 * @param {number} params.totalEvents - Total events in period
 * @param {string|null} params.latestEventDate - ISO timestamp of latest event
 * @param {number} params.nowTimestamp - Current reference timestamp
 * @returns {'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE'}
 */
export function evaluateStudentEngagement({ totalEvents = 0, latestEventDate = null, nowTimestamp = Date.now() }) {
  if (totalEvents === 0 || !latestEventDate) {
    return 'INACTIVE';
  }

  const daysSinceLatest = Math.max(0, (nowTimestamp - new Date(latestEventDate).getTime()) / (1000 * 60 * 60 * 24));

  if (totalEvents >= 3 && daysSinceLatest <= 7) {
    return 'HIGH';
  }
  if (totalEvents >= 2 || daysSinceLatest <= 14) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// ----------------------------------------------------------------------------
// 4. STUDENT ANALYTICS ENGINE
// ----------------------------------------------------------------------------

/**
 * Computes individual analytics records for all eligible students.
 * Strictly excludes teachers and non-student members.
 * @param {Array} events - All learning events for the classroom
 * @param {Array} studentMembers - Verified enrolled students (role === 'student')
 * @param {Object} options - Configuration options & period definitions
 * @returns {Array} List of student analytics records
 */
export function computeStudentAnalytics(events = [], studentMembers = [], options = {}) {
  const periodDays = options.periodDays || ANALYTICS_CONFIG.DEFAULT_PERIOD_DAYS;
  const now = options.nowTimestamp || Date.now();
  const currentWindowStart = now - (periodDays * 24 * 60 * 60 * 1000);
  const previousWindowStart = now - (2 * periodDays * 24 * 60 * 60 * 1000);

  // Group events by student_id
  const eventsByStudent = new Map();
  for (const ev of events) {
    if (!ev.student_id) continue;
    if (!eventsByStudent.has(ev.student_id)) {
      eventsByStudent.set(ev.student_id, []);
    }
    eventsByStudent.get(ev.student_id).push(ev);
  }

  const totalClassActivities = options.totalClassActivities || 0;

  return studentMembers.map(member => {
    const studentId = member.profile_id || member.id;
    const profile = member.profile || {};
    const fullName = member.display_name || profile.full_name || 'Student';
    const email = profile.email || '';
    const avatarUrl = profile.avatar_url || null;

    const studentEvents = eventsByStudent.get(studentId) || [];
    studentEvents.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    // Valid scored events
    const scoredEvents = studentEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const totalEvents = studentEvents.length;
    const validScoresCount = scoredEvents.length;

    // Averages
    const totalScoreSum = scoredEvents.reduce((sum, e) => sum + Number(e.percentage), 0);
    const averagePercentage = validScoresCount > 0
      ? Number((totalScoreSum / validScoresCount).toFixed(2))
      : null;

    // Accuracy calculation: percentage of questions or score earned
    let accuracyPercentage = averagePercentage;
    const eventsWithCorrectCounts = studentEvents.filter(e => e.metadata?.correct_count != null && e.metadata?.total_questions != null);
    if (eventsWithCorrectCounts.length > 0) {
      const totalCorrect = eventsWithCorrectCounts.reduce((s, e) => s + Number(e.metadata.correct_count), 0);
      const totalQuestions = eventsWithCorrectCounts.reduce((s, e) => s + Math.max(1, Number(e.metadata.total_questions)), 0);
      if (totalQuestions > 0) {
        accuracyPercentage = Number(((totalCorrect / totalQuestions) * 100).toFixed(2));
      }
    }

    const strongResultsCount = scoredEvents.filter(e => Number(e.percentage) >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD).length;
    const weakResultsCount = scoredEvents.filter(e => Number(e.percentage) < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD).length;

    // Topic performance for this student
    const studentTopicMap = new Map();
    for (const ev of scoredEvents) {
      const rawTopic = ev.topic || ev.category;
      if (!rawTopic || !rawTopic.trim()) continue;
      const t = rawTopic.trim();
      if (!studentTopicMap.has(t)) {
        studentTopicMap.set(t, { topic: t, total: 0, count: 0 });
      }
      const item = studentTopicMap.get(t);
      item.total += Number(ev.percentage);
      item.count += 1;
    }

    const strongAreas = [];
    const weakAreas = [];
    for (const [topicName, stat] of studentTopicMap.entries()) {
      const topicAvg = Number((stat.total / stat.count).toFixed(1));
      if (topicAvg >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD) {
        strongAreas.push({ topic: topicName, average: topicAvg, count: stat.count });
      } else if (topicAvg < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD) {
        weakAreas.push({ topic: topicName, average: topicAvg, count: stat.count });
      }
    }
    strongAreas.sort((a, b) => b.average - a.average);
    weakAreas.sort((a, b) => a.average - b.average);

    // 5-Source Activity Breakdown for this student
    const studentActivityBreakdown = {
      live_quiz: { attempts: 0, averageScore: null, highestScore: null, recentScore: null },
      exam: { attempts: 0, averageScore: null, passedCount: 0, failedCount: 0 },
      assignment: { attempts: 0, averageScore: null, completedCount: 0 },
      ocr: { attempts: 0, averageScore: null },
      ai_challenge: { attempts: 0, averageScore: null }
    };

    const sourceEvents = {
      live_quiz: studentEvents.filter(e => e.activity_type === 'live_quiz'),
      exam: studentEvents.filter(e => e.activity_type === 'exam'),
      assignment: studentEvents.filter(e => e.activity_type === 'assignment'),
      ocr: studentEvents.filter(e => e.activity_type === 'ocr'),
      ai_challenge: studentEvents.filter(e => e.activity_type === 'ai_challenge' || e.activity_type === 'competition')
    };

    for (const [typeKey, evList] of Object.entries(sourceEvents)) {
      const scored = evList.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
      const avg = scored.length > 0 ? Number((scored.reduce((s, e) => s + Number(e.percentage), 0) / scored.length).toFixed(1)) : null;

      if (typeKey === 'live_quiz') {
        studentActivityBreakdown.live_quiz = {
          attempts: evList.length,
          averageScore: avg,
          highestScore: scored.length > 0 ? Math.max(...scored.map(e => Number(e.percentage))) : null,
          recentScore: scored.length > 0 ? Number(scored[0].percentage) : null
        };
      } else if (typeKey === 'exam') {
        const passed = evList.filter(e => e.metadata?.passed === true || (e.percentage != null && Number(e.percentage) >= 50)).length;
        studentActivityBreakdown.exam = {
          attempts: evList.length,
          averageScore: avg,
          passedCount: passed,
          failedCount: evList.length - passed
        };
      } else if (typeKey === 'assignment') {
        studentActivityBreakdown.assignment = {
          attempts: evList.length,
          averageScore: avg,
          completedCount: evList.length
        };
      } else if (typeKey === 'ocr') {
        studentActivityBreakdown.ocr = {
          attempts: evList.length,
          averageScore: avg
        };
      } else if (typeKey === 'ai_challenge') {
        studentActivityBreakdown.ai_challenge = {
          attempts: evList.length,
          averageScore: avg
        };
      }
    }

    // Chronological assessment history
    const assessmentHistory = studentEvents.map(e => ({
      id: e.id,
      activityId: e.activity_id,
      activityType: e.activity_type,
      activityTitle: e.activity_title || 'Classroom Activity',
      topic: e.topic || e.category || 'General',
      score: e.score != null ? Number(e.score) : null,
      maxScore: e.max_score != null ? Number(e.max_score) : null,
      percentage: e.percentage != null ? Number(e.percentage) : null,
      completedAt: e.completed_at,
      metadata: e.metadata || {}
    }));

    // Most recent activity
    const mostRecent = studentEvents[0] || null;
    const mostRecentActivity = mostRecent ? {
      completedAt: mostRecent.completed_at,
      title: mostRecent.activity_title || 'Classroom Activity',
      activityType: mostRecent.activity_type || 'activity',
      percentage: mostRecent.percentage != null ? Number(mostRecent.percentage) : null
    } : null;

    // Trend calculation: Current vs Previous period
    const currentPeriodEvents = scoredEvents.filter(e => {
      const t = new Date(e.completed_at).getTime();
      return t >= currentWindowStart && t <= now;
    });

    const previousPeriodEvents = scoredEvents.filter(e => {
      const t = new Date(e.completed_at).getTime();
      return t >= previousWindowStart && t < currentWindowStart;
    });

    const recentAvg = currentPeriodEvents.length > 0
      ? Number((currentPeriodEvents.reduce((s, e) => s + Number(e.percentage), 0) / currentPeriodEvents.length).toFixed(2))
      : null;

    const previousAvg = previousPeriodEvents.length > 0
      ? Number((previousPeriodEvents.reduce((s, e) => s + Number(e.percentage), 0) / previousPeriodEvents.length).toFixed(2))
      : null;

    const scoreChange = (recentAvg != null && previousAvg != null)
      ? Number((recentAvg - previousAvg).toFixed(2))
      : null;

    let trend = 'STEADY';
    if (scoreChange != null) {
      if (scoreChange >= ANALYTICS_CONFIG.IMPROVEMENT_DELTA_THRESHOLD) trend = 'IMPROVING';
      else if (scoreChange <= ANALYTICS_CONFIG.DECLINE_DELTA_THRESHOLD) trend = 'DECLINING';
    }

    // Distinct active dates & activities
    const distinctDates = new Set(studentEvents.map(e => (e.completed_at || '').substring(0, 10)));
    const distinctActivities = new Set(studentEvents.map(e => e.activity_id));

    // Completion rate
    const completionRate = totalClassActivities > 0
      ? Math.min(100, Math.round((distinctActivities.size / totalClassActivities) * 100))
      : (distinctActivities.size > 0 ? 100 : 0);

    // Frequency (events per week over span)
    const activeDaysCount = distinctDates.size;
    const eventsPerWeek = Number(((totalEvents / Math.max(1, periodDays)) * 7).toFixed(1));

    // Confidence
    const confidence = evaluateDataConfidence(validScoresCount, distinctActivities.size, activeDaysCount);

    // Engagement
    const engagementIndicator = evaluateStudentEngagement({
      totalEvents,
      latestEventDate: mostRecent ? mostRecent.completed_at : null,
      nowTimestamp: now
    });

    // Classification
    const classification = classifyStudentPerformance({
      averagePercentage,
      validEventsCount: validScoresCount,
      scoreChange,
      confidence
    });

    return {
      studentId,
      fullName,
      email,
      avatarUrl,
      totalEvents,
      attempts: totalEvents,
      averagePercentage,
      accuracyPercentage,
      completionRate,
      strongResultsCount,
      weakResultsCount,
      strongAreas,
      weakAreas,
      activityBreakdown: studentActivityBreakdown,
      assessmentHistory,
      mostRecentActivity,
      recentAveragePercentage: recentAvg,
      previousAveragePercentage: previousAvg,
      scoreChangePercentagePoints: scoreChange,
      trend,
      activityFrequency: {
        eventsPerWeek,
        activeDaysCount
      },
      engagementIndicator,
      performanceCategory: classification.category,
      performanceCategoryLabel: classification.label,
      confidence
    };
  });
}

// ----------------------------------------------------------------------------
// 5. ACTIVITY BREAKDOWN ANALYTICS ENGINE
// ----------------------------------------------------------------------------

export function computeActivityAnalytics(events = [], totalStudents = 1) {
  const activityTypes = [
    { type: 'assignment', label: 'Tasks & Assignments' },
    { type: 'exam', label: 'Exams & Assessments' },
    { type: 'live_quiz', label: 'Multiplayer Live Quizzes' },
    { type: 'ocr', label: 'AI OCR Worksheets' },
    { type: 'ai_challenge', label: 'AI Challenges & Competitions' }
  ];

  const breakdown = {};

  for (const { type, label } of activityTypes) {
    const typeEvents = events.filter(e => e.activity_type === type || (type === 'ai_challenge' && e.activity_type === 'competition'));
    const scoredEvents = typeEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const eventCount = typeEvents.length;

    const participatingStudents = new Set(typeEvents.map(e => e.student_id).filter(Boolean));
    const participatingStudentsCount = participatingStudents.size;
    const participationRate = totalStudents > 0
      ? Number(((participatingStudentsCount / totalStudents) * 100).toFixed(2))
      : 0;

    let averagePercentage = null;
    let strongResultsCount = 0;
    let weakResultsCount = 0;

    if (scoredEvents.length > 0) {
      const sum = scoredEvents.reduce((s, e) => s + Number(e.percentage), 0);
      averagePercentage = Number((sum / scoredEvents.length).toFixed(2));
      strongResultsCount = scoredEvents.filter(e => Number(e.percentage) >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD).length;
      weakResultsCount = scoredEvents.filter(e => Number(e.percentage) < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD).length;
    }

    const latestEvent = typeEvents.length > 0
      ? [...typeEvents].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
      : null;

    const distinctDates = new Set(typeEvents.map(e => (e.completed_at || '').substring(0, 10)));
    const distinctActivities = new Set(typeEvents.map(e => e.activity_id));
    const confidence = evaluateDataConfidence(scoredEvents.length, distinctActivities.size, distinctDates.size);

    breakdown[type] = {
      activityType: type,
      label,
      eventCount,
      averagePercentage,
      strongResultsCount,
      weakResultsCount,
      participatingStudentsCount,
      participationRate,
      mostRecentActivityAt: latestEvent ? latestEvent.completed_at : null,
      confidence
    };
  }

  return breakdown;
}

// ----------------------------------------------------------------------------
// 6. TOPIC & CATEGORY ANALYTICS ENGINE
// ----------------------------------------------------------------------------

export function computeTopicAnalytics(events = [], options = {}) {
  const periodDays = options.periodDays || ANALYTICS_CONFIG.DEFAULT_PERIOD_DAYS;
  const now = options.nowTimestamp || Date.now();
  const currentWindowStart = now - (periodDays * 24 * 60 * 60 * 1000);
  const previousWindowStart = now - (2 * periodDays * 24 * 60 * 60 * 1000);

  const topicGroups = new Map();

  for (const ev of events) {
    const rawTopic = ev.topic || ev.category;
    if (!rawTopic || !rawTopic.trim()) {
      continue; // Strictly omit undefined or empty topics
    }
    const topic = rawTopic.trim();
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, {
        topic,
        category: ev.category || 'General',
        events: []
      });
    }
    topicGroups.get(topic).events.push(ev);
  }

  const topicRecords = [];

  for (const [topic, group] of topicGroups.entries()) {
    const topicEvents = group.events;
    const scoredEvents = topicEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const eventCount = topicEvents.length;
    const participatingStudents = new Set(topicEvents.map(e => e.student_id).filter(Boolean));

    let averagePercentage = null;
    if (scoredEvents.length > 0) {
      const sum = scoredEvents.reduce((s, e) => s + Number(e.percentage), 0);
      averagePercentage = Number((sum / scoredEvents.length).toFixed(2));
    }

    // Trend calculation
    const currentEvents = scoredEvents.filter(e => {
      const t = new Date(e.completed_at).getTime();
      return t >= currentWindowStart && t <= now;
    });

    const previousEvents = scoredEvents.filter(e => {
      const t = new Date(e.completed_at).getTime();
      return t >= previousWindowStart && t < currentWindowStart;
    });

    let scoreChange = null;
    if (currentEvents.length > 0 && previousEvents.length > 0) {
      const curAvg = currentEvents.reduce((s, e) => s + Number(e.percentage), 0) / currentEvents.length;
      const prevAvg = previousEvents.reduce((s, e) => s + Number(e.percentage), 0) / previousEvents.length;
      scoreChange = Number((curAvg - prevAvg).toFixed(2));
    }

    const distinctDates = new Set(topicEvents.map(e => (e.completed_at || '').substring(0, 10)));
    const distinctActivities = new Set(topicEvents.map(e => e.activity_id));
    const confidence = evaluateDataConfidence(scoredEvents.length, distinctActivities.size, distinctDates.size);

    // Topic status determination
    let status = 'steady';
    if (scoredEvents.length < 2 || averagePercentage == null) {
      status = 'insufficient_data';
    } else if (scoreChange != null && scoreChange >= ANALYTICS_CONFIG.IMPROVEMENT_DELTA_THRESHOLD) {
      status = 'improving';
    } else if (scoreChange != null && scoreChange <= ANALYTICS_CONFIG.DECLINE_DELTA_THRESHOLD) {
      status = 'declining';
    } else if (averagePercentage >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD) {
      status = 'strong';
    } else if (averagePercentage < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD) {
      status = 'weak';
    }

    topicRecords.push({
      topic,
      category: group.category,
      eventCount,
      averagePercentage,
      participatingStudentsCount: participatingStudents.size,
      scoreChangePercentagePoints: scoreChange,
      status,
      confidence
    });
  }

  // Sort topics by eventCount DESC, then averagePercentage DESC
  return topicRecords.sort((a, b) => b.eventCount - a.eventCount || (b.averagePercentage || 0) - (a.averagePercentage || 0));
}

// ----------------------------------------------------------------------------
// 7. PERIOD-OVER-PERIOD TREND ANALYSIS ENGINE
// ----------------------------------------------------------------------------

export function computeTrendAnalytics(events = [], totalStudents = 1, options = {}) {
  const periodDays = options.periodDays || ANALYTICS_CONFIG.DEFAULT_PERIOD_DAYS;
  const now = options.nowTimestamp || Date.now();
  const currentPeriodStart = new Date(now - (periodDays * 24 * 60 * 60 * 1000)).toISOString();
  const currentPeriodEnd = new Date(now).toISOString();
  const previousPeriodStart = new Date(now - (2 * periodDays * 24 * 60 * 60 * 1000)).toISOString();
  const previousPeriodEnd = currentPeriodStart;

  const currentWindowMs = new Date(currentPeriodStart).getTime();
  const previousWindowMs = new Date(previousPeriodStart).getTime();

  const currentEvents = events.filter(e => {
    const t = new Date(e.completed_at).getTime();
    return t >= currentWindowMs && t <= now;
  });

  const previousEvents = events.filter(e => {
    const t = new Date(e.completed_at).getTime();
    return t >= previousWindowMs && t < currentWindowMs;
  });

  const currentScored = currentEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
  const previousScored = previousEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));

  const currentActiveStudents = new Set(currentEvents.map(e => e.student_id).filter(Boolean)).size;
  const previousActiveStudents = new Set(previousEvents.map(e => e.student_id).filter(Boolean)).size;

  const currentScoreAvg = currentScored.length > 0
    ? Number((currentScored.reduce((s, e) => s + Number(e.percentage), 0) / currentScored.length).toFixed(2))
    : null;

  const previousScoreAvg = previousScored.length > 0
    ? Number((previousScored.reduce((s, e) => s + Number(e.percentage), 0) / previousScored.length).toFixed(2))
    : null;

  const isAvailable = previousScored.length > 0 && currentScored.length > 0;
  const scoreChange = isAvailable ? Number((currentScoreAvg - previousScoreAvg).toFixed(2)) : null;
  const activityCountChange = currentEvents.length - previousEvents.length;
  const activityPercentageChange = previousEvents.length > 0
    ? Number((((currentEvents.length - previousEvents.length) / previousEvents.length) * 100).toFixed(2))
    : null;
  const participationChange = currentActiveStudents - previousActiveStudents;

  const distinctDates = new Set(currentEvents.map(e => (e.completed_at || '').substring(0, 10)));
  const distinctActivities = new Set(currentEvents.map(e => e.activity_id));
  const confidence = isAvailable
    ? evaluateDataConfidence(currentScored.length + previousScored.length, distinctActivities.size, distinctDates.size)
    : (currentScored.length > 0 ? evaluateDataConfidence(currentScored.length, distinctActivities.size, distinctDates.size) : 'INSUFFICIENT');

  return {
    isAvailable,
    periodDays,
    currentPeriodStart,
    currentPeriodEnd,
    previousPeriodStart,
    previousPeriodEnd,
    currentScoreAverage: currentScoreAvg,
    previousScoreAverage: previousScoreAvg,
    scoreChangePercentagePoints: scoreChange,
    currentEventCount: currentEvents.length,
    previousEventCount: previousEvents.length,
    activityCountChange,
    activityPercentageChange,
    currentActiveStudents,
    previousActiveStudents,
    participationChange,
    confidence,
    reason: isAvailable ? undefined : (previousScored.length === 0 ? 'No historical activity in previous comparison period' : 'No activity in current period')
  };
}

// ----------------------------------------------------------------------------
// 8. UNIFIED CLASSROOM ANALYTICS COMPILATION SERVICE
// ----------------------------------------------------------------------------

/**
 * Master entrypoint: Computes the full suite of classroom and student analytics.
 * @param {Object} serverSupabase - Supabase client instance
 * @param {string} classroomId - Target classroom UUID
 * @param {Object} options - Optional filters (periodDays, startDate, endDate, etc.)
 * @returns {Promise<Object>} Complete ClassroomAnalyticsSummary
 */
export async function computeClassroomAnalytics(serverSupabase, classroomId, options = {}) {
  if (!serverSupabase || !classroomId) {
    throw new Error('Supabase client and valid classroomId are required.');
  }

  // 1. Fetch Classroom Metadata
  const { data: classroom, error: cErr } = await serverSupabase
    .from('classrooms')
    .select('id, title, subject, grade, teacher_id, created_at')
    .eq('id', classroomId)
    .maybeSingle();

  if (cErr || !classroom) {
    throw new Error(`Classroom ${classroomId} not found: ${cErr?.message || 'Unknown error'}`);
  }

  // 2. Fetch Classroom Members (Strictly separate students from teachers/admins)
  const { data: members, error: mErr } = await serverSupabase
    .from('classroom_members')
    .select(`
      id,
      classroom_id,
      profile_id,
      role,
      status,
      display_name,
      joined_at,
      profile:profiles!classroom_members_profile_id_fkey(id, full_name, email, avatar_url, role)
    `)
    .eq('classroom_id', classroomId)
    .eq('status', 'active');

  if (mErr) {
    throw new Error(`Failed to load classroom members: ${mErr.message}`);
  }

  // Filter ONLY students (Exclude teachers and admins)
  const studentMembers = (members || []).filter(m => m.role === 'student');
  const totalStudents = studentMembers.length;

  // 3. Query Unified Learning Events from the Phase 1 View
  let query = serverSupabase
    .from('v_classroom_learning_events')
    .select('*')
    .eq('classroom_id', classroomId);

  if (options.startDate) {
    query = query.gte('completed_at', options.startDate);
  }
  if (options.endDate) {
    query = query.lte('completed_at', options.endDate);
  }

  const { data: rawEvents, error: eErr } = await query;
  if (eErr) {
    throw new Error(`Failed to load learning events from view: ${eErr.message}`);
  }

  const events = rawEvents || [];

  // Sort events chronologically (most recent first)
  events.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  // 4. Scored & Valid Events
  const scoredEvents = events.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
  const totalEvents = events.length;

  // Distinct completed activities
  const completedActivityIds = new Set(events.map(e => e.activity_id).filter(Boolean));
  const completedActivitiesCount = completedActivityIds.size;

  // Active students
  const activeStudentIds = new Set(events.map(e => e.student_id).filter(Boolean));
  const activeStudents = activeStudentIds.size;

  // Classroom-wide average percentage
  const totalPercentageSum = scoredEvents.reduce((s, e) => s + Number(e.percentage), 0);
  const averagePercentage = scoredEvents.length > 0
    ? Number((totalPercentageSum / scoredEvents.length).toFixed(2))
    : null;

  const strongResultsCount = scoredEvents.filter(e => Number(e.percentage) >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD).length;
  const weakResultsCount = scoredEvents.filter(e => Number(e.percentage) < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD).length;

  // Measure completion rate where applicable (assignments & published items)
  let completionRate = null;
  if (totalStudents > 0 && completedActivitiesCount > 0) {
    // If measurable against total student capacity
    const totalPossibleAttempts = completedActivitiesCount * totalStudents;
    completionRate = Number(Math.min(100, ((events.length / totalPossibleAttempts) * 100)).toFixed(2));
  }

  // 5. Compute sub-analytics
  const distinctDates = new Set(events.map(e => (e.completed_at || '').substring(0, 10)));
  const dataConfidence = evaluateDataConfidence(scoredEvents.length, completedActivitiesCount, distinctDates.size);

  const studentAnalytics = computeStudentAnalytics(events, studentMembers, {
    ...options,
    totalClassActivities: completedActivitiesCount
  });
  const activityBreakdown = computeActivityAnalytics(events, totalStudents);
  const topicAnalytics = computeTopicAnalytics(events, options);
  const trendAnalytics = computeTrendAnalytics(events, totalStudents, options);

  // Improving and Struggling students
  const improvingStudents = studentAnalytics.filter(
    s => s.trend === 'IMPROVING' || (s.scoreChangePercentagePoints != null && s.scoreChangePercentagePoints >= ANALYTICS_CONFIG.IMPROVEMENT_DELTA_THRESHOLD)
  );

  const strugglingStudents = studentAnalytics.filter(
    s => s.performanceCategory === 'AT_RISK' ||
         s.performanceCategory === 'NEEDS_SUPPORT' ||
         (s.averagePercentage != null && s.averagePercentage < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD) ||
         (s.scoreChangePercentagePoints != null && s.scoreChangePercentagePoints <= ANALYTICS_CONFIG.DECLINE_DELTA_THRESHOLD)
  );

  // Top Strengths (Topics >= 75%)
  const topStrengths = topicAnalytics
    .filter(t => t.averagePercentage != null && t.averagePercentage >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD)
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      averageScore: Math.round(t.averagePercentage),
      eventsCount: t.eventCount,
      status: t.status
    }));

  // Top Weaknesses (Topics < 60% or declining)
  const topWeaknesses = topicAnalytics
    .filter(t => t.averagePercentage != null && (t.averagePercentage < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD || t.status === 'declining' || t.status === 'weak'))
    .slice(0, 5)
    .map(t => ({
      topic: t.topic,
      averageScore: Math.round(t.averagePercentage),
      eventsCount: t.eventCount,
      change: t.scoreChangePercentagePoints,
      status: t.status
    }));

  // Deterministic Ranked Attention Cases (Ranked based on real evidence)
  const studentsNeedingAttention = strugglingStudents
    .sort((a, b) => {
      const aScore = a.averagePercentage != null ? a.averagePercentage : 0;
      const bScore = b.averagePercentage != null ? b.averagePercentage : 0;
      if (aScore !== bScore) return aScore - bScore;
      const aDelta = a.scoreChangePercentagePoints || 0;
      const bDelta = b.scoreChangePercentagePoints || 0;
      return aDelta - bDelta;
    })
    .slice(0, 8)
    .map(s => {
      const recentEv = s.assessmentHistory && s.assessmentHistory[0];
      const recentEvidenceStr = recentEv
        ? `Scored ${recentEv.percentage ?? recentEv.score}% on ${recentEv.activityTitle} (${new Date(recentEv.completedAt).toLocaleDateString()})`
        : 'No recent assessment submissions';
      const mainWeakness = s.weakAreas[0]?.topic || (s.averagePercentage != null && s.averagePercentage < 50 ? 'Core assessment mastery' : 'Targeted concept practice');
      const recAction = s.averagePercentage != null && s.averagePercentage < 50
        ? 'Schedule 1-on-1 diagnostic review and assign scaffolded fundamentals practice.'
        : s.scoreChangePercentagePoints != null && s.scoreChangePercentagePoints <= -5
        ? 'Review recent misconceptions and follow up on quiz errors.'
        : 'Assign targeted review quiz and check in on comprehension.';

      return {
        studentId: s.studentId,
        student_ref: s.fullName,
        average_score: s.averagePercentage,
        trend: s.scoreChangePercentagePoints != null
          ? `${s.scoreChangePercentagePoints >= 0 ? '+' : ''}${s.scoreChangePercentagePoints}%`
          : (s.trend || 'Steady'),
        main_weakness: mainWeakness,
        recent_evidence: recentEvidenceStr,
        recommended_action: recAction,
        attempts: s.totalEvents,
        completion_rate: s.completionRate
      };
    });

  // Class Health Object
  const classHealth = {
    classAverage: averagePercentage != null ? Math.round(averagePercentage) : null,
    participationRate: totalStudents > 0 ? Math.min(100, Math.round((activeStudents / totalStudents) * 100)) : 0,
    completionRate: completionRate != null ? Math.round(completionRate) : (totalEvents > 0 ? 100 : 0),
    assessmentActivityCount: totalEvents,
    improvingCount: improvingStudents.length,
    improvingStudents: improvingStudents.map(s => ({
      studentId: s.studentId,
      name: s.fullName,
      average: s.averagePercentage,
      change: s.scoreChangePercentagePoints
    })),
    strugglingCount: strugglingStudents.length,
    strugglingStudents: strugglingStudents.map(s => ({
      studentId: s.studentId,
      name: s.fullName,
      average: s.averagePercentage,
      trend: s.scoreChangePercentagePoints,
      weakestArea: s.weakAreas[0]?.topic || 'Multiple areas'
    }))
  };

  // 6. Recent activity feed (up to 15 latest events with resolved student names)
  const studentNameMap = new Map();
  studentMembers.forEach(m => {
    const sid = m.profile_id || m.id;
    studentNameMap.set(sid, m.display_name || m.profile?.full_name || 'Student');
  });

  const recentActivity = events.slice(0, 15).map(e => ({
    id: e.id,
    studentId: e.student_id,
    studentName: studentNameMap.get(e.student_id) || 'Student',
    activityType: e.activity_type,
    activityTitle: e.activity_title || 'Activity',
    topic: e.topic || e.category || null,
    score: e.score != null ? Number(e.score) : null,
    maxScore: e.max_score != null ? Number(e.max_score) : null,
    percentage: e.percentage != null ? Number(e.percentage) : null,
    completedAt: e.completed_at
  }));

  return {
    classroom: {
      id: classroom.id,
      title: classroom.title,
      subject: classroom.subject,
      grade: classroom.grade,
      teacherId: classroom.teacher_id
    },
    overview: {
      totalStudents,
      activeStudents,
      totalLearningEvents: totalEvents,
      completedActivitiesCount,
      averagePercentage,
      strongResultsCount,
      weakResultsCount,
      completionRate,
      confidence: dataConfidence
    },
    classHealth,
    topStrengths,
    topWeaknesses,
    studentsNeedingAttention,
    recentActivity,
    students: studentAnalytics,
    activityBreakdown,
    topics: topicAnalytics,
    trends: trendAnalytics,
    dataConfidence,
    calculatedAt: new Date().toISOString()
  };
}
