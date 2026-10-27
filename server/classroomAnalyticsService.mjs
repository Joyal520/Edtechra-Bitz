import {
  CANONICAL_CONCEPTS,
  CLASS_PERFORMANCE_THRESHOLDS,
  classifyStudentPerformanceBand,
  classifyQuestionAndAnswerToConcept,
  normalizeConcept as normalizeCanonicalConcept,
  extractStructuredErrorsFromEvent,
  sanitizeConceptInput
} from './conceptNormalization.mjs';

export { CLASS_PERFORMANCE_THRESHOLDS, classifyStudentPerformanceBand };

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

export function normalizeConcept(rawTopic) {
  if (!rawTopic) return 'General';
  const canonical = normalizeCanonicalConcept(rawTopic);
  if (canonical) return canonical.displayName;
  let topic = sanitizeConceptInput(rawTopic);
  if (!topic || topic.toLowerCase() === 'assignment' || topic.toLowerCase() === 'task') return 'General Task';
  return topic;
}

/**
 * Normalizes an educational activity into Category -> Topic -> Skill hierarchy.
 * Extracts granular teaching concepts from titles, topics, and rubric metadata.
 * Strips raw JSON, session IDs, and general knowledge trivia.
 * @param {Object} ev - Learning event object
 * @returns {{ category: string, topic: string, skill: string, displayName: string, teachAction: string, commonError: any, isPlaceholder: boolean }}
 */
export function extractConceptHierarchy(ev) {
  if (!ev) {
    return { category: 'General', topic: 'General', skill: 'Core Concepts', displayName: 'General', teachAction: '', commonError: null, isPlaceholder: true };
  }

  // 1. Check inner diagnostic meta or detected errors from OCR / writing evaluation
  const meta = ev.metadata || {};
  let detectedConcept = meta.concept || null;
  if (!detectedConcept && Array.isArray(meta.breakdown_json)) {
    const diagMeta = meta.breakdown_json.find(b => b && b.__is_diagnostic_meta);
    if (diagMeta?.concept) detectedConcept = diagMeta.concept;
  }
  if (!detectedConcept && Array.isArray(ev.breakdown_json?.criteria)) {
    const crit = ev.breakdown_json.criteria[0];
    if (crit?.name) detectedConcept = crit.name;
  }
  if (!detectedConcept && meta.writing_evaluation?.topic) {
    detectedConcept = meta.writing_evaluation.topic;
  }
  if (!detectedConcept && (meta.question_text || meta.question)) {
    detectedConcept = meta.question_text || meta.question;
  }

  const rawTopic = sanitizeConceptInput(ev.topic || meta.topic || '');
  const rawTitle = sanitizeConceptInput(ev.activity_title || ev.activityTitle || '');
  const category = (ev.category || meta.category || '').trim();

  // Try canonical concept normalization
  const canonical = normalizeCanonicalConcept(detectedConcept || rawTopic || rawTitle, category) ||
                    normalizeCanonicalConcept(`${rawTitle} ${rawTopic} ${detectedConcept || ''}`, category);

  if (canonical) {
    return {
      category: canonical.category,
      topic: canonical.topic,
      skill: canonical.skill,
      displayName: canonical.displayName,
      teachAction: canonical.teachAction,
      commonError: canonical.commonError,
      isPlaceholder: false
    };
  }

  // If not matching a canonical concept, check if it's a valid clean curriculum topic
  const cleanTopic = rawTopic || rawTitle;
  const lower = cleanTopic.toLowerCase();

  if (!cleanTopic || cleanTopic.length < 3 || /^(?:assignment|task|general|other|science|test|unit\s*test|homework|classwork|exam|quiz|live\s*quiz|grammar|spelling|writing|reading|vocabulary)$/i.test(lower) || /general\s*knowledge|trivia|entertainment|fun\s*quiz|pub\s*quiz|movie\s*quiz/i.test(lower)) {
    return {
      category: 'General',
      topic: cleanTopic || 'Class Activity',
      skill: 'General Review',
      displayName: cleanTopic || 'Class Activity',
      teachAction: '',
      commonError: null,
      isPlaceholder: true
    };
  }

  return {
    category: category || 'Curriculum',
    topic: cleanTopic,
    skill: 'Core Comprehension',
    displayName: `${cleanTopic} — Core Concepts`,
    teachAction: `Review foundational concepts for ${cleanTopic} with direct examples and guided practice.`,
    commonError: null,
    isPlaceholder: false
  };
}

/**
 * Chronologically aggregates scored assessment events by calendar date.
 * Collapses multiple activities/attempts on the same date into a single class-average percentage.
 * Excludes nulls, invalid percentages, and does NOT insert 0 for missing days.
 * @param {Array} events - Scored learning events
 * @returns {Array<{ date: string, isoDate: string, timestamp: number, value: number, eventCount: number, sources: string[] }>}
 */
export function computePerformanceOverTime(events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  // 1. Filter events with valid completed_at and valid percentage
  const validEvents = events.filter(e => {
    if (e.percentage == null) return false;
    const num = Number(e.percentage);
    if (isNaN(num) || num < 0 || num > 100) return false;
    if (!e.completed_at) return false;
    const d = new Date(e.completed_at);
    return !isNaN(d.getTime());
  });

  if (validEvents.length === 0) {
    return [];
  }

  // 2. Group by calendar date (YYYY-MM-DD)
  const dateMap = new Map();
  for (const ev of validEvents) {
    const d = new Date(ev.completed_at);
    const dateKey = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        dateKey,
        timestamp: new Date(dateKey + 'T12:00:00Z').getTime(),
        sumPercentage: 0,
        count: 0,
        sources: new Set()
      });
    }
    const bucket = dateMap.get(dateKey);
    bucket.sumPercentage += Number(ev.percentage);
    bucket.count += 1;
    if (ev.activity_type) {
      bucket.sources.add(ev.activity_type);
    }
  }

  // 3. Sort chronologically ascending
  const sortedDates = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // 4. Return clean, rounded date points
  return sortedDates.map(item => {
    const avg = Number((item.sumPercentage / item.count).toFixed(1));
    const d = new Date(item.timestamp);
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return {
      date: formattedDate,
      isoDate: item.dateKey,
      timestamp: item.timestamp,
      value: Math.round(avg),
      count: item.count,
      eventCount: item.count,
      sources: Array.from(item.sources)
    };
  });
}

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

    // Chronological assessment history with granular concept hierarchy
    const assessmentHistory = studentEvents.map(e => {
      const hierarchy = e.displayName && e.skill ? e : extractConceptHierarchy(e);
      return {
        id: e.id,
        activityId: e.activity_id || e.activityId || e.id,
        activityType: e.activityType || e.activity_type,
        rawActivityType: e.rawActivityType || e.activity_type,
        sourceLabel: e.sourceLabel || (e.activity_type === 'live_quiz' ? 'Live Quiz' : e.activity_type === 'ocr' ? 'OCR' : e.activity_type === 'exam' ? 'Assessment' : 'Task'),
        activityTitle: e.activityTitle || e.activity_title || 'Classroom Activity',
        topic: hierarchy.topic || e.topic || 'General',
        baseTopic: hierarchy.topic || e.topic || 'General',
        skill: hierarchy.skill || null,
        category: hierarchy.category || 'General',
        displayName: hierarchy.displayName || e.topic || 'Class Activity',
        rawTopic: e.rawTopic || e.topic || 'General',
        score: e.score != null ? Number(e.score) : null,
        maxScore: e.max_score != null ? Number(e.max_score) : (e.maxScore != null ? Number(e.maxScore) : null),
        percentage: e.percentage != null ? Number(e.percentage) : null,
        completedAt: e.completed_at || e.completedAt,
        metadata: e.metadata || {}
      };
    });

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
// 6. TOPIC & DIAGNOSTIC ANALYTICS ENGINE (50% OCR/WRITING, 30% EXAMS, 20% QUIZZES)
// ----------------------------------------------------------------------------

/**
 * Checks whether an activity/event is relevant to the classroom's core subject.
 * Prevents non-curriculum trivia (e.g. World Capitals in English class) from polluting topic weaknesses.
 */
export function isEventRelevantToSubject(ev, subject = '') {
  if (!subject || typeof subject !== 'string') return true;
  const subLower = subject.toLowerCase().trim();
  const rawTitle = (ev.activity_title || ev.activityTitle || '').toLowerCase();
  const rawTopic = (ev.topic || ev.category || '').toLowerCase();
  const combined = `${rawTitle} ${rawTopic}`;

  const isTrivia = /general\s*knowledge|trivia|world\s*capitals|pub\s*quiz|movie\s*quiz|celebrity|entertainment\s*quiz/i.test(combined);
  if (isTrivia) {
    if (/english|language|writing|reading|esl|ela|literature|grammar|spelling|vocabulary/i.test(subLower)) {
      return false;
    }
  }
  return true;
}

/**
 * Deterministic Priority Algorithm for Classroom Diagnoses.
 * Prioritizes:
 * 1. Number of students affected (ratio of cohort)
 * 2. Error frequency (repeated occurrences)
 * 3. Gap severity (distance from mastery benchmark)
 * 4. Evidence source strength (OCR/Tasks 50%, Exams 30%, Quizzes/Comp 20%)
 * 5. Cross-source confirmation bonus
 */
export function calculateDeterministicPriority({
  affected_students = 1,
  total_students = 1,
  accuracy = 50,
  frequency = 1,
  sourcesCount = 1,
  ocrTasksCount = 0,
  examsCount = 0,
  quizzesCount = 0
}) {
  const total = Math.max(1, total_students);
  const studentImpact = Math.min(1.0, affected_students / total); // 0.0 to 1.0
  const gapSeverity = Math.min(1.0, Math.max(0, (100 - accuracy) / 100)); // 0.0 to 1.0
  const freqFactor = Math.min(1.0, Math.max(0.2, frequency / 8)); // 0.2 to 1.0

  // Source weight contribution: OCR/Tasks 50%, Exams 30%, Quizzes/Comp 20%
  let sourceWeightScore = 0.35;
  if (ocrTasksCount > 0) sourceWeightScore += 0.35;
  if (examsCount > 0) sourceWeightScore += 0.20;
  if (quizzesCount > 0) sourceWeightScore += 0.10;
  sourceWeightScore = Math.min(1.0, sourceWeightScore);

  const isMultiSource = sourcesCount >= 2 || (ocrTasksCount > 0 && (examsCount > 0 || quizzesCount > 0)) || (affected_students >= 2);
  const multiSourceMultiplier = isMultiSource ? 1.25 : 1.0;

  const rawScore = (
    studentImpact * 0.35 +
    gapSeverity * 0.30 +
    freqFactor * 0.15 +
    sourceWeightScore * 0.20
  ) * multiSourceMultiplier;

  return Math.min(0.99, Number(rawScore.toFixed(2)));
}

export function computeTopicAnalytics(events = [], options = {}) {
  const periodDays = options.periodDays || ANALYTICS_CONFIG.DEFAULT_PERIOD_DAYS;
  const now = options.nowTimestamp || Date.now();
  const currentWindowStart = now - (periodDays * 24 * 60 * 60 * 1000);
  const previousWindowStart = now - (2 * periodDays * 24 * 60 * 60 * 1000);
  const classroomSubject = options.classroomSubject || options.subject || '';

  const topicGroups = new Map();

  for (const ev of events) {
    const rawTopic = ev.topic || ev.category;
    if (!rawTopic || !rawTopic.trim()) {
      continue; // Strictly omit undefined or empty topics
    }

    // Check subject relevance
    const isRelevant = isEventRelevantToSubject(ev, classroomSubject);

    const hierarchy = extractConceptHierarchy(ev);
    const key = hierarchy.displayName;

    if (!hierarchy.isPlaceholder) {
      if (!topicGroups.has(key)) {
        topicGroups.set(key, {
          diagnosis_id: hierarchy.diagnosis_id || `diag_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          key,
          topic: hierarchy.topic,
          skill: hierarchy.skill,
          subskill: hierarchy.subskill || 'core_skill',
          displayName: hierarchy.displayName,
          category: hierarchy.category || 'Grammar',
          specific_problem: hierarchy.specific_problem || `Students demonstrate accuracy gaps in ${hierarchy.displayName}.`,
          teachAction: hierarchy.teachAction || null,
          recommended_teaching: hierarchy.recommended_teaching || hierarchy.teachAction || `Review foundational concepts for ${hierarchy.displayName} with guided sentence practice.`,
          defaultCommonError: hierarchy.commonError || null,
          defaultCommonErrors: hierarchy.commonErrors || (hierarchy.commonError ? [hierarchy.commonError] : []),
          isPlaceholder: false,
          isRelevant,
          events: []
        });
      }
      topicGroups.get(key).events.push({
        ...ev,
        isRelevant
      });
    }

    // Detailed criteria breakdown enrichment (e.g. from OCR or AI challenges)
    const breakdown = Array.isArray(ev.metadata?.breakdown_json) ? ev.metadata.breakdown_json : [];
    for (const crit of breakdown) {
      if (!crit || !crit.criterion || crit.max <= 0 || crit.score == null) continue;
      if (crit.__is_diagnostic_meta) continue;

      const critPct = Number(((crit.score / crit.max) * 100).toFixed(2));
      const critName = crit.criterion.trim();
      let parentTopic = hierarchy.topic && hierarchy.topic !== 'Other' ? hierarchy.topic : 'Writing';
      let parentCat = hierarchy.category && hierarchy.category !== 'General' ? hierarchy.category : 'Writing';
      if (/structure|syntax/i.test(critName)) {
        parentTopic = 'Sentence Mechanics';
        parentCat = 'Grammar';
      } else if (/spelling/i.test(critName)) {
        parentTopic = 'Spelling';
        parentCat = 'Spelling';
      } else if (/tense|agreement/i.test(critName)) {
        parentTopic = 'Grammar';
        parentCat = 'Grammar';
      } else if (/punctuation|capitalization/i.test(critName)) {
        parentTopic = 'Sentence Mechanics';
        parentCat = 'Grammar';
      } else if (/clarity|flow|organization/i.test(critName)) {
        parentTopic = 'Paragraph Writing';
        parentCat = 'Writing';
      } else if (/vocabulary|word choice/i.test(critName)) {
        parentTopic = 'Vocabulary';
        parentCat = 'Vocabulary';
      }

      const critCanonical = normalizeCanonicalConcept(critName, parentCat);
      const critKey = critCanonical ? critCanonical.displayName : `${parentTopic} — ${critName}`;
      const cTopic = critCanonical ? critCanonical.topic : parentTopic;
      const cSkill = critCanonical ? critCanonical.skill : critName;
      const cSubskill = critCanonical ? critCanonical.subskill : 'rubric_criterion';
      const cCat = critCanonical ? critCanonical.category : parentCat;

      if (!topicGroups.has(critKey)) {
        topicGroups.set(critKey, {
          diagnosis_id: critCanonical?.diagnosis_id || `diag_${critKey.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          key: critKey,
          topic: cTopic,
          skill: cSkill,
          subskill: cSubskill,
          displayName: critKey,
          category: cCat,
          specific_problem: critCanonical?.specific_problem || `Students scored below benchmark on ${critKey}.`,
          teachAction: critCanonical?.teachAction || null,
          recommended_teaching: critCanonical?.recommended_teaching || critCanonical?.teachAction || `Review ${critKey} with structured examples.`,
          defaultCommonError: critCanonical?.commonError || null,
          defaultCommonErrors: critCanonical?.commonErrors || (critCanonical?.commonError ? [critCanonical?.commonError] : []),
          isPlaceholder: false,
          isRelevant,
          events: []
        });
      }
      topicGroups.get(critKey).events.push({
        ...ev,
        percentage: critPct,
        topic: cTopic,
        isRelevant
      });
    }
  }

  const topicRecords = [];

  for (const [, group] of topicGroups.entries()) {
    const topicEvents = group.events;
    const scoredEvents = topicEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const eventCount = scoredEvents.length;
    const participatingStudents = new Set(scoredEvents.map(e => e.student_id).filter(Boolean));

    // Calculate source buckets with 50% OCR+Tasks / 30% Exams / 20% Quizzes+Comp
    const ocrTaskEvents = scoredEvents.filter(e => e.activity_type === 'ocr' || e.activity_type === 'assignment' || e.activity_type === 'task');
    const examEvents = scoredEvents.filter(e => e.activity_type === 'exam' || e.activity_type === 'assessment');
    const quizCompEvents = scoredEvents.filter(e => (e.activity_type === 'live_quiz' || e.activity_type === 'quiz' || e.activity_type === 'ai_challenge' || e.activity_type === 'competition') && e.isRelevant !== false);

    const ocrAvg = ocrTaskEvents.length > 0 ? (ocrTaskEvents.reduce((s, e) => s + Number(e.percentage), 0) / ocrTaskEvents.length) : null;
    const examAvg = examEvents.length > 0 ? (examEvents.reduce((s, e) => s + Number(e.percentage), 0) / examEvents.length) : null;
    const quizAvg = quizCompEvents.length > 0 ? (quizCompEvents.reduce((s, e) => s + Number(e.percentage), 0) / quizCompEvents.length) : null;

    let totalWeight = 0;
    let weightedScoreSum = 0;

    if (ocrAvg !== null) {
      weightedScoreSum += ocrAvg * 0.50;
      totalWeight += 0.50;
    }
    if (examAvg !== null) {
      weightedScoreSum += examAvg * 0.30;
      totalWeight += 0.30;
    }
    if (quizAvg !== null) {
      weightedScoreSum += quizAvg * 0.20;
      totalWeight += 0.20;
    }

    let averagePercentage = null;
    if (totalWeight > 0) {
      averagePercentage = Number((weightedScoreSum / totalWeight).toFixed(2));
    } else if (scoredEvents.length > 0) {
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

    const SOURCE_LABEL_MAP = {
      assignment: 'Task',
      task: 'Task',
      live_quiz: 'Live Quiz',
      quiz: 'Live Quiz',
      exam: 'Exam',
      assessment: 'Exam',
      ocr: 'OCR',
      ai_challenge: 'Competition',
      competition: 'Competition'
    };

    const evidenceBreakdown = {
      assignment: { avg: null, count: 0 },
      exam: { avg: null, count: 0 },
      live_quiz: { avg: null, count: 0 },
      ocr: { avg: null, count: 0 },
      ai_challenge: { avg: null, count: 0 }
    };

    const distinctSources = new Set();
    const friendlySourcesSet = new Set();

    // Extract structured student errors from all events in this group
    const extractedErrorsList = [];
    const errorOccurrencesMap = new Map();
    const affectedStudentIds = new Set();

    // Track affected students (score < 70)
    const studentScoreSums = new Map();
    for (const ev of scoredEvents) {
      const type = ev.activity_type === 'competition' ? 'ai_challenge' : ev.activity_type;
      distinctSources.add(type);
      const friendlyName = SOURCE_LABEL_MAP[type] || 'Task';
      friendlySourcesSet.add(friendlyName);

      if (evidenceBreakdown[type]) {
        evidenceBreakdown[type].count += 1;
        evidenceBreakdown[type].avg = evidenceBreakdown[type].avg === null ? Number(ev.percentage) : evidenceBreakdown[type].avg + Number(ev.percentage);
      }

      if (ev.student_id) {
        if (!studentScoreSums.has(ev.student_id)) {
          studentScoreSums.set(ev.student_id, { sum: 0, count: 0 });
        }
        const st = studentScoreSums.get(ev.student_id);
        st.sum += Number(ev.percentage);
        st.count += 1;
      }

      // Collect structured error pairs
      const errors = extractStructuredErrorsFromEvent(ev);
      for (const err of errors) {
        const pairKey = `${err.student_error}->${err.correct_form}`;
        if (!errorOccurrencesMap.has(pairKey)) {
          errorOccurrencesMap.set(pairKey, {
            student_error: err.student_error,
            correct_form: err.correct_form,
            correction: err.correct_form,
            occurrences: 0,
            studentIds: new Set()
          });
        }
        const item = errorOccurrencesMap.get(pairKey);
        item.occurrences += 1;
        if (ev.student_id) {
          item.studentIds.add(ev.student_id);
          affectedStudentIds.add(ev.student_id);
        }
      }
    }

    const evidenceList = [];
    for (const type of Object.keys(evidenceBreakdown)) {
      if (evidenceBreakdown[type].count > 0) {
        evidenceBreakdown[type].avg = Math.round(evidenceBreakdown[type].avg / evidenceBreakdown[type].count);
        evidenceList.push({
          source: SOURCE_LABEL_MAP[type] || type,
          rawSource: type,
          accuracy: evidenceBreakdown[type].avg,
          attempts: evidenceBreakdown[type].count
        });
      }
    }

    // Count distinct students who scored < 70 or made diagnosed errors
    for (const [sId, st] of studentScoreSums.entries()) {
      if ((st.sum / st.count) < 70) {
        affectedStudentIds.add(sId);
      }
    }

    let affectedStudentsCount = affectedStudentIds.size;
    if (options.totalStudents > 0) {
      affectedStudentsCount = Math.min(affectedStudentsCount, options.totalStudents);
    }

    const totalErrorFrequency = Array.from(errorOccurrencesMap.values()).reduce((s, e) => s + e.occurrences, 0) || Math.max(1, affectedStudentsCount);

    const sourcesCount = distinctSources.size;
    const sourcesList = Array.from(friendlySourcesSet);

    // Calculate deterministic priority score
    const priorityScore = calculateDeterministicPriority({
      affected_students: affectedStudentsCount,
      total_students: options.totalStudents || participatingStudents.size || 1,
      accuracy: averagePercentage != null ? Math.round(averagePercentage) : 50,
      frequency: totalErrorFrequency,
      sourcesCount,
      ocrTasksCount: ocrTaskEvents.length,
      examsCount: examEvents.length,
      quizzesCount: quizCompEvents.length
    });

    // Confidence: Confirmed Gap (>= 2 sources or multi-student) vs Early Signal
    let confidence = 'developing';
    if ((sourcesCount >= 2 || affectedStudentsCount >= 2) && (averagePercentage != null && averagePercentage < 70)) {
      confidence = 'confirmed';
    } else if (sourcesCount < 2 && (averagePercentage != null && averagePercentage < 70)) {
      confidence = 'early_signal';
    } else if (averagePercentage != null && averagePercentage >= 75) {
      confidence = 'confirmed';
    }

    // Structured common errors / examples
    const sortedErrorEntries = Array.from(errorOccurrencesMap.values()).sort((a, b) => b.occurrences - a.occurrences);
    let commonErrors = sortedErrorEntries.slice(0, 3).map(e => ({
      student_error: e.student_error,
      correct_form: e.correct_form,
      correction: e.correct_form
    }));

    if (commonErrors.length === 0 && group.defaultCommonErrors && group.defaultCommonErrors.length > 0) {
      commonErrors = group.defaultCommonErrors.map(e => ({
        student_error: e.student_error,
        correct_form: e.correct_form || e.correction,
        correction: e.correct_form || e.correction
      }));
    } else if (commonErrors.length === 0 && group.defaultCommonError) {
      commonErrors = [{
        student_error: group.defaultCommonError.student_error,
        correct_form: group.defaultCommonError.correct_form || group.defaultCommonError.correction,
        correction: group.defaultCommonError.correct_form || group.defaultCommonError.correction
      }];
    }

    const canonicalObj = normalizeCanonicalConcept(group.displayName) || normalizeCanonicalConcept(group.topic);
    const teachAction = group.teachAction || canonicalObj?.teachAction || `Review foundational concepts for ${group.displayName} with direct examples and guided sentence practice.`;
    const recommendedTeaching = group.recommended_teaching || canonicalObj?.recommended_teaching || teachAction;
    const specificProblem = group.specific_problem || canonicalObj?.specific_problem || `Students demonstrate accuracy gaps in ${group.displayName}.`;

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

    const confDisplay = confidence === 'confirmed' ? 'Confirmed gap' : 'Early signal';

    topicRecords.push({
      diagnosis_id: group.diagnosis_id || `diag_${group.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      category: group.category.toLowerCase(),
      skill: group.skill,
      subskill: group.subskill,
      topic: group.topic,
      displayName: group.displayName,
      specific_problem: specificProblem,
      affected_students: affectedStudentsCount,
      total_students: options.totalStudents || participatingStudents.size || 1,
      accuracy: averagePercentage != null ? Math.round(averagePercentage) : 0,
      frequency: totalErrorFrequency,
      severity: (averagePercentage != null && averagePercentage < 50) ? 'high' : (averagePercentage != null && averagePercentage < 70) ? 'medium' : 'low',
      confidence,
      evidence_sources: sourcesList,
      examples: commonErrors,
      recommended_teaching: recommendedTeaching,
      priority_score: priorityScore,

      // Legacy compatibility fields
      eventCount,
      averagePercentage,
      score: averagePercentage != null ? Math.round(averagePercentage) : 0,
      participatingStudentsCount: participatingStudents.size,
      affectedStudentsCount,
      studentCount: affectedStudentsCount,
      studentsAffected: affectedStudentsCount,
      studentsTotal: options.totalStudents || participatingStudents.size || 1,
      scoreChangePercentagePoints: scoreChange,
      status,
      confidence_label: confDisplay === 'Confirmed gap'
        ? `Confirmed gap • ${sourcesCount} evidence source${sourcesCount > 1 ? 's' : ''}`
        : `Early signal • ${sourcesCount} evidence source`,
      sources: sourcesList,
      sourcesCount,
      sourcesList,
      evidence: evidenceList,
      evidenceBreakdown,
      commonErrors,
      common_errors: commonErrors,
      teachAction,
      recommended_action: recommendedTeaching,
      why: `Class accuracy is ${averagePercentage != null ? Math.round(averagePercentage) : 0}% with ${affectedStudentsCount} of ${options.totalStudents || participatingStudents.size} students affected across ${sourcesCount} source(s).`,
      priority: priorityScore
    });
  }

  // Sort topics by priority DESC, then eventCount DESC
  return topicRecords.sort((a, b) => (b.priority_score ?? b.priority ?? 0) - (a.priority_score ?? a.priority ?? 0) || b.eventCount - a.eventCount);
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
// 7B. QUESTION-LEVEL OPPORTUNITY & SPECIFIC SKILL DIAGNOSTIC ENGINE
// ----------------------------------------------------------------------------

/**
 * Computes the Class Performance Distribution across the four required bands:
 *  - Excellent: 85% – 100%
 *  - Good: 70% – 84.99%
 *  - Pretty: 50% – 69.99%
 *  - Bad: below 50%
 *  - unclassified: students with < 1 completed scored assessment
 *
 * Counts unique individual students based on their normalized assessment average
 * (excluding speed/streak gamification bonus points).
 */
export function computePerformanceDistribution(studentAnalytics = [], totalStudents = 0) {
  const counts = {
    excellent: 0,
    good: 0,
    pretty: 0,
    bad: 0,
    unclassified: 0
  };

  const studentsByBand = {
    excellent: [],
    good: [],
    pretty: [],
    bad: [],
    unclassified: []
  };

  for (const st of studentAnalytics) {
    const scoredCount = Array.isArray(st.assessmentHistory)
      ? st.assessmentHistory.filter(h => h.percentage != null && !Number.isNaN(Number(h.percentage))).length
      : st.totalEvents || 0;
    const band = classifyStudentPerformanceBand(st.averagePercentage, scoredCount);
    counts[band] = (counts[band] || 0) + 1;
    studentsByBand[band].push({
      studentId: st.studentId,
      fullName: st.fullName,
      averagePercentage: st.averagePercentage
    });
  }

  // If totalStudents exceeds studentAnalytics length, treat remaining as unclassified
  const accounted =
    counts.excellent + counts.good + counts.pretty + counts.bad + counts.unclassified;
  if (totalStudents > accounted) {
    counts.unclassified += totalStudents - accounted;
  }

  const eligibleAssessedStudents = counts.excellent + counts.good + counts.pretty + counts.bad;
  const pct = (count) =>
    eligibleAssessedStudents > 0
      ? Number(((count / eligibleAssessedStudents) * 100).toFixed(1))
      : 0;

  const totalEnrolledStudents = Math.max(totalStudents, accounted);

  return {
    excellent: counts.excellent,
    good: counts.good,
    pretty: counts.pretty,
    bad: counts.bad,
    unclassified: counts.unclassified,
    eligibleAssessedStudents,
    eligibleCount: eligibleAssessedStudents,
    totalEnrolledStudents,
    totalStudents: totalEnrolledStudents,
    unclassifiedCount: counts.unclassified,
    percentages: {
      excellent: pct(counts.excellent),
      good: pct(counts.good),
      pretty: pct(counts.pretty),
      bad: pct(counts.bad)
    },
    thresholds: CLASS_PERFORMANCE_THRESHOLDS,
    bands: [
      {
        key: 'excellent',
        label: 'Excellent',
        rangeLabel: '85% – 100%',
        count: counts.excellent,
        percentage: pct(counts.excellent),
        color: CLASS_PERFORMANCE_THRESHOLDS.excellent.color,
        students: studentsByBand.excellent
      },
      {
        key: 'good',
        label: 'Good',
        rangeLabel: '70% – 84.99%',
        count: counts.good,
        percentage: pct(counts.good),
        color: CLASS_PERFORMANCE_THRESHOLDS.good.color,
        students: studentsByBand.good
      },
      {
        key: 'pretty',
        label: 'Pretty',
        rangeLabel: '50% – 69.99%',
        count: counts.pretty,
        percentage: pct(counts.pretty),
        color: CLASS_PERFORMANCE_THRESHOLDS.pretty.color,
        students: studentsByBand.pretty
      },
      {
        key: 'bad',
        label: 'Bad',
        rangeLabel: 'Below 50%',
        count: counts.bad,
        percentage: pct(counts.bad),
        color: CLASS_PERFORMANCE_THRESHOLDS.bad.color,
        students: studentsByBand.bad
      }
    ]
  };
}

/**
 * Extracts question-level skill response opportunities from all 4 classroom sources
 * (Tasks, Live Quizzes, Examinations, Competitions) + OCR worksheets, and builds
 * specific, non-overlapping skill diagnoses with exact denominators:
 *  - affectedStudentCount: unique students who made >= 1 error on that skill
 *  - studentsAssessed: unique students who had >= 1 response opportunity on that skill
 *  - affectedPercentage: round((affectedStudentCount / studentsAssessed) * 100)
 *  - accuracyPercentage: round((correctOpportunities / totalOpportunities) * 100)
 *  - errorOccurrenceCount: total wrong response opportunities / mistakes on that skill
 *  - totalOpportunities: total response opportunities on that skill
 */
export function buildQuestionLevelSkillDiagnoses({
  normalizedEvents = [],
  examResults = [],
  examsById: rawExamsById = new Map(),
  classroomExams = [],
  taskSubmissions = [],
  assignmentSubmissions = [],
  tasksById: rawTasksById = new Map(),
  assignments = [],
  liveQuizAnswers = [],
  liveQuizQuestionsById: rawQuizQuestionsById = new Map(),
  liveQuizQuestions = [],
  liveQuizSessionsById: rawQuizSessionsById = new Map(),
  liveQuizSessions = [],
  challengeSubmissions = [],
  challengesById: rawChallengesById = new Map(),
  aiChallenges = [],
  totalStudents = 0,
  classroomSubject = ''
} = {}) {
  const examsById =
    rawExamsById instanceof Map && rawExamsById.size > 0
      ? rawExamsById
      : new Map((classroomExams || []).map((e) => [e.id, e]));
  const tasksById =
    rawTasksById instanceof Map && rawTasksById.size > 0
      ? rawTasksById
      : new Map((assignments || []).map((t) => [t.id, t]));
  const liveQuizQuestionsById =
    rawQuizQuestionsById instanceof Map && rawQuizQuestionsById.size > 0
      ? rawQuizQuestionsById
      : new Map((liveQuizQuestions || []).map((q) => [q.id, q]));
  const liveQuizSessionsById =
    rawQuizSessionsById instanceof Map && rawQuizSessionsById.size > 0
      ? rawQuizSessionsById
      : new Map((liveQuizSessions || []).map((s) => [s.id, s]));
  const challengesById =
    rawChallengesById instanceof Map && rawChallengesById.size > 0
      ? rawChallengesById
      : new Map((aiChallenges || []).map((c) => [c.id, c]));
  const effectiveTaskSubmissions =
    taskSubmissions && taskSubmissions.length > 0 ? taskSubmissions : assignmentSubmissions;
  const skillBuckets = new Map();
  // Track all students who answered each specific question (or activity) so that when an error
  // on a question maps to a specific misconception (e.g. SIMPLE_PAST_BASE_SUBSTITUTION),
  // peers who answered that same question correctly are counted in `studentsAssessed` and `correctOpportunities`.
  const questionCorrectStudentsMap = new Map(); // key: `${activityId}::${questionKey}` -> Set<studentId>
  const activityRespondentsMap = new Map(); // key: `${activityId}` -> Set<studentId>

  const registerActivityRespondent = (activityId, studentId) => {
    if (!activityId || !studentId) return;
    const key = String(activityId);
    if (!activityRespondentsMap.has(key)) activityRespondentsMap.set(key, new Set());
    activityRespondentsMap.get(key).add(String(studentId));
  };

  const registerQuestionCorrectStudent = (activityId, questionKey, studentId) => {
    if (!activityId || questionKey === undefined || questionKey === null || !studentId) return;
    const key = `${activityId}::${questionKey}`;
    if (!questionCorrectStudentsMap.has(key)) questionCorrectStudentsMap.set(key, new Set());
    questionCorrectStudentsMap.get(key).add(String(studentId));
  };

  const SOURCE_DISPLAY = {
    task: 'Tasks',
    assignment: 'Tasks',
    ocr: 'Tasks',
    live_quiz: 'Live Quiz',
    quiz: 'Live Quiz',
    exam: 'Examination',
    assessment: 'Examination',
    competition: 'Competition',
    ai_challenge: 'Competition'
  };

  const ensureBucket = (canonical) => {
    if (!canonical || !canonical.diagnosis_id) return null;
    const key = canonical.diagnosis_id;
    if (!skillBuckets.has(key)) {
      skillBuckets.set(key, {
        diagnosis_id: canonical.diagnosis_id,
        category: canonical.category || 'Grammar',
        topic: canonical.topic || 'Grammar',
        skill: canonical.skill || 'grammar',
        subskill: canonical.subskill || 'core_concept',
        displayName: canonical.displayName || canonical.topic || 'Concept',
        specific_problem: canonical.specific_problem || `Students show recurring errors in ${canonical.displayName}.`,
        recommended_teaching:
          canonical.recommended_teaching ||
          canonical.teachAction ||
          `Teach ${canonical.displayName} with explicit modeling and contrast examples.`,
        follow_up_activity:
          canonical.follow_up_activity ||
          `Assign a 5-item guided practice check targeting ${canonical.displayName}.`,
        reassessment_method:
          canonical.reassessment_method ||
          `Administer a short 5-question exit check on ${canonical.displayName}.`,
        defaultExamples:
          canonical.commonErrors || (canonical.commonError ? [canonical.commonError] : []),
        assessedStudentIds: new Set(),
        affectedStudentIds: new Set(),
        totalOpportunities: 0,
        correctOpportunities: 0,
        errorOccurrenceCount: 0,
        evidenceSources: new Set(),
        rawSources: new Set(),
        evidenceIds: new Set(),
        activityIds: new Set(),
        questionKeys: new Set(),
        countedQuestionStudentPairs: new Set(),
        errorExamplesMap: new Map()
      });
    }
    return skillBuckets.get(key);
  };

  const recordOpportunity = ({
    canonical,
    studentId,
    isCorrect,
    sourceType,
    evidenceId,
    activityId,
    questionKey = null,
    studentError = '',
    correctForm = '',
    questionPrompt = ''
  }) => {
    if (!canonical || !studentId) return;
    const bucket = ensureBucket(canonical);
    if (!bucket) return;

    if (activityId) registerActivityRespondent(activityId, studentId);
    const qCompoundKey =
      activityId && questionKey !== null && questionKey !== undefined
        ? `${activityId}::${questionKey}`
        : null;
    if (qCompoundKey) {
      bucket.questionKeys.add(qCompoundKey);
      bucket.countedQuestionStudentPairs.add(`${qCompoundKey}::${studentId}`);
    }

    bucket.assessedStudentIds.add(String(studentId));
    bucket.totalOpportunities += 1;
    const friendlySource = SOURCE_DISPLAY[sourceType] || 'Tasks';
    bucket.evidenceSources.add(friendlySource);
    bucket.rawSources.add(sourceType);
    if (evidenceId) bucket.evidenceIds.add(String(evidenceId));
    if (activityId) bucket.activityIds.add(String(activityId));

    if (isCorrect) {
      bucket.correctOpportunities += 1;
    } else {
      bucket.affectedStudentIds.add(String(studentId));
      bucket.errorOccurrenceCount += 1;
      const errText = String(studentError || '').trim();
      const corrText = String(correctForm || '').trim();
      if (errText || corrText) {
        const exKey = `${errText.toLowerCase()}->${corrText.toLowerCase()}`;
        if (!bucket.errorExamplesMap.has(exKey)) {
          bucket.errorExamplesMap.set(exKey, {
            student_error: questionPrompt && errText.length < 12
              ? `${questionPrompt} (Answered: "${errText}")`
              : errText || questionPrompt,
            correct_form: corrText,
            correction: corrText,
            occurrences: 0
          });
        }
        bucket.errorExamplesMap.get(exKey).occurrences += 1;
      }
    }
  };

  // 1. Unpack Question-Level Exam Results (`classroom_exam_results` + `classroom_exams`)
  for (const res of examResults) {
    const studentId = res.student_id;
    const exam = examsById.get(res.exam_id);
    if (!studentId || !exam) continue;

    const rawItems = Array.isArray(exam.questions)
      ? exam.questions
      : Array.isArray(exam.questions_json)
      ? exam.questions_json
      : Array.isArray(exam.sections)
      ? exam.sections
      : [];
    const rawQuestions = rawItems.flatMap((item) => {
      if (!item) return [];
      const secQs = Array.isArray(item.questions) ? item.questions : [];
      const actQs = Array.isArray(item.activities)
        ? item.activities.flatMap((act) => (Array.isArray(act?.questions) ? act.questions : []))
        : [];
      if (secQs.length > 0 || actQs.length > 0) {
        return [...secQs, ...actQs];
      }
      return [item];
    });
    const qMap = new Map();
    rawQuestions.forEach((q, idx) => {
      if (q) {
        const key = String(q.id ?? q.questionId ?? idx);
        qMap.set(key, q);
      }
    });

    const answersObj = res.answers && typeof res.answers === 'object' ? res.answers : {};
    const breakdownList = Array.isArray(res.breakdown_json)
      ? res.breakdown_json
      : Array.isArray(res.breakdown_json?.questions)
      ? res.breakdown_json.questions
      : [];

    if (breakdownList.length > 0) {
      for (const bItem of breakdownList) {
        if (!bItem) continue;
        const qKey = String(bItem.question_id ?? bItem.questionId ?? bItem.id);
        const qObj = qMap.get(qKey) || {};
        const qText = bItem.question_text || bItem.prompt || qObj.question || qObj.questionText || qObj.prompt || qObj.text || '';
        const corrAns =
          bItem.correct_answer ||
          bItem.expected_answer ||
          qObj.correct_answer ||
          qObj.correctAnswer ||
          qObj.answer ||
          '';
        const stuAns = bItem.student_answer ?? bItem.answer ?? answersObj[qObj.id ?? qObj.questionId ?? qKey] ?? '';
        const topicHint = qObj.topic || qObj.skill || bItem.topic || exam.subject || exam.title || '';
        const isCorrect =
          bItem.is_correct != null
            ? Boolean(bItem.is_correct)
            : bItem.score != null && bItem.max_score != null
            ? Number(bItem.score) >= Number(bItem.max_score)
            : String(stuAns).trim().toLowerCase() === String(corrAns).trim().toLowerCase();

        const canonical = classifyQuestionAndAnswerToConcept({
          questionText: qText,
          correctAnswer: String(corrAns),
          studentAnswer: String(stuAns),
          topicHint,
          explanation: qObj.explanation || bItem.feedback || ''
        });

        if (isCorrect) {
          registerQuestionCorrectStudent(res.exam_id, qKey, studentId);
        }
        if (canonical) {
          recordOpportunity({
            canonical,
            studentId,
            isCorrect,
            sourceType: 'exam',
            evidenceId: res.id,
            activityId: res.exam_id,
            questionKey: qKey,
            studentError: isCorrect ? '' : String(stuAns),
            correctForm: String(corrAns),
            questionPrompt: qText
          });
        }
      }
    } else if (rawQuestions.length > 0 && Object.keys(answersObj).length > 0) {
      rawQuestions.forEach((qObj, idx) => {
        if (!qObj) return;
        const qId = String(qObj.id ?? qObj.questionId ?? idx);
        const rawStuAns = answersObj[qId] ?? answersObj[idx];
        if (rawStuAns === undefined) return;
        const qText = qObj.question || qObj.questionText || qObj.prompt || qObj.text || '';
        let corrAns = qObj.correct_answer ?? qObj.correctAnswer ?? qObj.answer ?? '';
        if (Array.isArray(corrAns) && corrAns.length === 1) {
          corrAns = corrAns[0];
        }
        if (Array.isArray(qObj.options) && typeof corrAns === 'number') {
          corrAns = qObj.options[corrAns] ?? corrAns;
        }
        let stuAns = rawStuAns;
        if (Array.isArray(stuAns) && stuAns.length === 1) {
          stuAns = stuAns[0];
        }
        if (Array.isArray(qObj.options) && typeof rawStuAns === 'number') {
          stuAns = qObj.options[rawStuAns] ?? rawStuAns;
        }
        const isCorrect =
          String(stuAns).trim().toLowerCase() === String(corrAns).trim().toLowerCase();
        if (isCorrect) {
          registerQuestionCorrectStudent(res.exam_id, qId, studentId);
        }
        const canonical = classifyQuestionAndAnswerToConcept({
          questionText: qText,
          correctAnswer: String(corrAns),
          studentAnswer: String(stuAns),
          topicHint: qObj.topic || qObj.skill || exam.subject || exam.title || '',
          explanation: qObj.explanation || ''
        });
        if (canonical) {
          recordOpportunity({
            canonical,
            studentId,
            isCorrect,
            sourceType: 'exam',
            evidenceId: res.id,
            activityId: res.exam_id,
            questionKey: qId,
            studentError: isCorrect ? '' : String(stuAns),
            correctForm: String(corrAns),
            questionPrompt: qText
          });
        }
      });
    }
  }

  // 2. Unpack Question-Level Task Submissions (`assignment_submissions` + `assignments`)
  for (const sub of effectiveTaskSubmissions) {
    const studentId = sub.student_id;
    const task = tasksById.get(sub.assignment_id);
    if (!studentId) continue;

    const taskQuestions = Array.isArray(task?.questions) ? task.questions : [];
    const tqMap = new Map();
    taskQuestions.forEach((q, idx) => {
      if (q) tqMap.set(String(q.id ?? idx), q);
    });

    const qaList = Array.isArray(sub.question_answers) ? sub.question_answers : [];
    for (const qa of qaList) {
      if (!qa || qa.question_id === 'writing_response' || qa.question_id === 'ocr_handwritten_response') {
        continue;
      }
      const qObj = tqMap.get(String(qa.question_id ?? qa.id)) || {};
      const qText = qa.question_text || qa.question || qObj.question || qObj.prompt || '';
      const corrAns =
        qa.correct_answer ?? qa.expected_answer ?? qObj.correct_answer ?? qObj.correctAnswer ?? '';
      const stuAns = qa.student_answer ?? qa.answer ?? qa.selected_option ?? '';
      if (!qText && !corrAns && !stuAns) continue;

      const isCorrect =
        qa.is_correct != null
          ? Boolean(qa.is_correct)
          : corrAns !== ''
          ? String(stuAns).trim().toLowerCase() === String(corrAns).trim().toLowerCase()
          : Number(sub.score ?? 100) >= 70;

      const canonical = classifyQuestionAndAnswerToConcept({
        questionText: qText,
        correctAnswer: String(corrAns),
        studentAnswer: String(stuAns),
        topicHint: qa.topic || qObj.topic || task?.topic || task?.title || '',
        explanation: qa.explanation || qObj.explanation || ''
      });

      if (canonical) {
        recordOpportunity({
          canonical,
          studentId,
          isCorrect,
          sourceType: 'task',
          evidenceId: sub.id,
          activityId: sub.assignment_id,
          studentError: isCorrect ? '' : String(stuAns),
          correctForm: String(corrAns),
          questionPrompt: qText
        });
      }
    }
  }

  // 3. Unpack Question-Level Live Quiz Answers (`live_quiz_answers` + `live_quiz_questions`)
  for (const ans of liveQuizAnswers) {
    const studentId = ans.student_id;
    const qObj = liveQuizQuestionsById.get(ans.question_id);
    const session = liveQuizSessionsById.get(ans.session_id);
    if (!studentId || !qObj) continue;

    const qText = qObj.question_text || '';
    const options = Array.isArray(qObj.options) ? qObj.options : [];
    const corrOpt = options.find(
      o => String(o?.id ?? o?.index ?? o) === String(qObj.correct_option)
    );
    const corrAns = corrOpt ? corrOpt.text || corrOpt.label || String(corrOpt) : String(qObj.correct_option || '');
    const stuOpt = options.find(
      o => String(o?.id ?? o?.index ?? o) === String(ans.selected_option)
    );
    const stuAns = stuOpt ? stuOpt.text || stuOpt.label || String(stuOpt) : String(ans.selected_option || '');
    const isCorrect = Boolean(ans.is_correct);

    const canonical = classifyQuestionAndAnswerToConcept({
      questionText: qText,
      correctAnswer: corrAns,
      studentAnswer: stuAns,
      topicHint: session?.topic || session?.title || '',
      explanation: qObj.explanation || ''
    });

    if (canonical) {
      recordOpportunity({
        canonical,
        studentId,
        isCorrect,
        sourceType: 'live_quiz',
        evidenceId: ans.id || ans.session_id,
        activityId: ans.session_id,
        studentError: isCorrect ? '' : stuAns,
        correctForm: corrAns,
        questionPrompt: qText
      });
    }
  }

  // 4. Unpack Competition / AI Challenge Submissions (`ai_challenge_submissions` + `ai_challenges`)
  for (const cSub of challengeSubmissions) {
    const studentId = cSub.student_id;
    const challenge = challengesById.get(cSub.challenge_id);
    if (!studentId) continue;

    const syntheticEv = {
      id: cSub.id,
      activity_id: cSub.challenge_id,
      student_id: studentId,
      topic: challenge?.topic || challenge?.title || '',
      metadata: {
        text_response: cSub.content_text || '',
        feedback: cSub.ai_feedback || '',
        breakdown_json: Array.isArray(cSub.criteria_json) ? cSub.criteria_json : []
      }
    };
    const extracted = extractStructuredErrorsFromEvent(syntheticEv);
    if (extracted.length > 0) {
      for (const err of extracted) {
        const canonical =
          Object.values(CANONICAL_CONCEPTS).find(c => c && c.diagnosis_id === err.diagnosis_id) ||
          normalizeCanonicalConcept(err.concept || err.specific_rule, err.category);
        if (canonical) {
          recordOpportunity({
            canonical,
            studentId,
            isCorrect: false,
            sourceType: 'competition',
            evidenceId: cSub.id,
            activityId: cSub.challenge_id,
            studentError: err.student_error,
            correctForm: err.correct_form
          });
        }
      }
    }
  }

  // 5. Unpack Structured Writing / OCR / Event-Level Errors & Opportunities from `normalizedEvents`
  for (const ev of normalizedEvents) {
    const studentId = ev.studentId || ev.student_id;
    if (!studentId) continue;
    if (!isEventRelevantToSubject(ev, classroomSubject)) continue;

    const sourceType = ev.activityType || ev.activity_type || 'task';
    const evId = ev.id;
    const actId = ev.activityId || ev.activity_id || ev.id;

    // 5a. Extract any explicit grammar/spelling/vocabulary errors on this event
    const structuredErrors = extractStructuredErrorsFromEvent(ev);
    if (structuredErrors.length > 0) {
      for (const err of structuredErrors) {
        let canonical =
          Object.values(CANONICAL_CONCEPTS).find(c => c && c.diagnosis_id === err.diagnosis_id) ||
          normalizeCanonicalConcept(err.concept || err.specific_rule, err.category);

        if (!canonical && err.error_type === 'spelling' && err.target_word) {
          const w = err.target_word.toLowerCase();
          canonical = {
            diagnosis_id: `diag_spelling_${w}`,
            category: 'Spelling',
            topic: 'Spelling',
            skill: 'spelling',
            subskill: `spelling_${w}`,
            displayName: `Spelling — "${err.target_word}"`,
            specific_problem: `Students misspell "${err.target_word}" as "${err.student_error}".`,
            recommended_teaching: `Teach the spelling pattern in "${err.target_word}" using syllable chunking and retrieval practice.`,
            follow_up_activity: `Write 4 sentences using "${err.target_word}" after a Look-Say-Cover-Write check.`,
            reassessment_method: `5-word contextual spelling dictation including "${err.target_word}".`,
            commonError: { student_error: err.student_error, correct_form: err.target_word },
            commonErrors: [{ student_error: err.student_error, correct_form: err.target_word }]
          };
        }

        if (canonical) {
          recordOpportunity({
            canonical,
            studentId,
            isCorrect: false,
            sourceType,
            evidenceId: evId,
            activityId: actId,
            studentError: err.student_error,
            correctForm: err.correct_form
          });
        }
      }
    }

    // 5b. Also register the overall activity concept opportunity so students who succeeded on that skill
    // are accurately included in `studentsAssessed` and `correctOpportunities`!
    const hierarchyConcept = normalizeCanonicalConcept(
      `${ev.displayName || ''} ${ev.topic || ''} ${ev.activityTitle || ''}`,
      ev.category || ''
    );
    if (hierarchyConcept && ev.percentage != null && !Number.isNaN(Number(ev.percentage))) {
      const bucket = skillBuckets.get(hierarchyConcept.diagnosis_id);
      const alreadyCountedForStudentAndActivity =
        bucket &&
        bucket.assessedStudentIds.has(String(studentId)) &&
        bucket.activityIds.has(String(actId));

      if (!alreadyCountedForStudentAndActivity) {
        const isMastered = Number(ev.percentage) >= 70 && structuredErrors.length === 0;
        recordOpportunity({
          canonical: hierarchyConcept,
          studentId,
          isCorrect: isMastered,
          sourceType,
          evidenceId: evId,
          activityId: actId
        });
      }
    }
  }

  // 6. Convert skill buckets into ranked, specific diagnostic objects with all 14 required fields
  const diagnoses = [];
  for (const [, bucket] of skillBuckets.entries()) {
    const affectedStudentCount = bucket.affectedStudentIds.size;
    if (affectedStudentCount === 0) continue; // Only include skills where at least 1 student had difficulty

    // Reconcile peers who answered the exact same questions correctly so `studentsAssessed`
    // and `correctOpportunities` include all students assessed on those questions.
    for (const qCompoundKey of bucket.questionKeys) {
      const correctStudents = questionCorrectStudentsMap.get(qCompoundKey);
      if (correctStudents) {
        for (const sId of correctStudents) {
          bucket.assessedStudentIds.add(sId);
          const pairKey = `${qCompoundKey}::${sId}`;
          if (!bucket.countedQuestionStudentPairs.has(pairKey)) {
            bucket.countedQuestionStudentPairs.add(pairKey);
            bucket.totalOpportunities += 1;
            bucket.correctOpportunities += 1;
          }
        }
      }
    }
    for (const actId of bucket.activityIds) {
      const actStudents = activityRespondentsMap.get(String(actId));
      if (actStudents) {
        for (const sId of actStudents) {
          bucket.assessedStudentIds.add(sId);
        }
      }
    }

    const studentsAssessed = Math.max(affectedStudentCount, bucket.assessedStudentIds.size);
    const affectedPercentage =
      studentsAssessed > 0
        ? Math.min(100, Math.round((affectedStudentCount / studentsAssessed) * 100))
        : 0;
    const totalOpportunities = Math.max(bucket.totalOpportunities, bucket.errorOccurrenceCount);
    const accuracyPercentage =
      totalOpportunities > 0
        ? Math.max(0, Math.min(100, Math.round((bucket.correctOpportunities / totalOpportunities) * 100)))
        : 0;
    const errorOccurrenceCount = Math.max(1, bucket.errorOccurrenceCount);
    const evidenceSources = Array.from(bucket.evidenceSources);
    const evidenceIds = Array.from(bucket.evidenceIds);
    const activityIds = Array.from(bucket.activityIds);

    const priorityScore = calculateDeterministicPriority({
      affected_students: affectedStudentCount,
      total_students: studentsAssessed,
      accuracy: accuracyPercentage,
      frequency: errorOccurrenceCount,
      sourcesCount: evidenceSources.length,
      ocrTasksCount: bucket.rawSources.has('task') || bucket.rawSources.has('ocr') ? 1 : 0,
      examsCount: bucket.rawSources.has('exam') ? 1 : 0,
      quizzesCount: bucket.rawSources.has('live_quiz') || bucket.rawSources.has('competition') ? 1 : 0
    });

    const severity =
      affectedPercentage >= 50 || accuracyPercentage < 50
        ? 'high'
        : affectedPercentage >= 25 || accuracyPercentage < 70
        ? 'medium'
        : 'low';

    const sortedExamples = Array.from(bucket.errorExamplesMap.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 3)
      .map(e => ({
        student_error: e.student_error,
        correct_form: e.correct_form,
        correction: e.correction
      }));

    const examples =
      sortedExamples.length > 0
        ? sortedExamples
        : (bucket.defaultExamples || []).slice(0, 2);

    // Build an explicit, evidence-grounded observedErrorPattern string
    const basePattern = bucket.specific_problem.replace(/\.$/, '');
    const observedErrorPattern = `${affectedStudentCount} of ${studentsAssessed} assessed student${
      studentsAssessed === 1 ? '' : 's'
    } (${affectedPercentage}%) struggled with ${bucket.displayName}: ${basePattern.charAt(0).toLowerCase()}${basePattern.slice(1)} (${errorOccurrenceCount} error occurrence${
      errorOccurrenceCount === 1 ? '' : 's'
    } across ${totalOpportunities} response opportunit${totalOpportunities === 1 ? 'y' : 'ies'}).`;

    diagnoses.push({
      // 14 Required Diagnostic Fields (camelCase + snake_case for full frontend/backend compatibility)
      diagnosis_id: bucket.diagnosis_id,
      category: bucket.category,
      topic: bucket.topic,
      skill: bucket.skill,
      subskill: bucket.subskill,
      displayName: bucket.displayName,
      observedErrorPattern,
      specific_problem: observedErrorPattern,
      affectedStudentCount,
      affected_students: affectedStudentCount,
      affected_students_count: affectedStudentCount,
      studentsAssessed,
      students_assessed: studentsAssessed,
      total_students: totalStudents || studentsAssessed,
      affectedPercentage,
      affected_percentage: affectedPercentage,
      accuracyPercentage,
      accuracy: accuracyPercentage,
      errorOccurrenceCount,
      frequency: errorOccurrenceCount,
      totalOpportunities,
      total_opportunities: totalOpportunities,
      evidenceSources,
      evidence_sources: evidenceSources,
      evidenceIds,
      evidence_ids: evidenceIds,
      activityIds,
      activity_ids: activityIds,
      severity,
      priority_score: priorityScore,
      priority: priorityScore,
      recommendedTeachingAction: bucket.recommended_teaching,
      recommended_teaching: bucket.recommended_teaching,
      teachAction: bucket.recommended_teaching,
      recommended_action: bucket.recommended_teaching,
      followUpActivity: bucket.follow_up_activity,
      follow_up_activity: bucket.follow_up_activity,
      reassessmentMethod: bucket.reassessment_method,
      reassessment_method: bucket.reassessment_method,
      confidence: evidenceSources.length >= 2 || affectedStudentCount >= 2 ? 'confirmed' : 'early_signal',
      examples,
      commonErrors: examples,
      common_errors: examples,
      affectedStudentIds: Array.from(bucket.affectedStudentIds),
      assessedStudentIds: Array.from(bucket.assessedStudentIds),
      // Legacy UI compatibility
      studentCount: affectedStudentCount,
      affectedStudentsCount: affectedStudentCount,
      studentsAffected: affectedStudentCount,
      studentsTotal: studentsAssessed,
      sources: evidenceSources,
      sourcesList: evidenceSources,
      sourcesCount: evidenceSources.length,
      why: observedErrorPattern
    });
  }

  // Sort by affectedStudentCount DESC, then priority_score DESC, then accuracy ASC
  return diagnoses.sort(
    (a, b) =>
      b.affectedStudentCount - a.affectedStudentCount ||
      b.priority_score - a.priority_score ||
      a.accuracyPercentage - b.accuracyPercentage
  );
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

  // Enrich OCR events with detailed criteria breakdowns for granular skill evidence
  try {
    const { data: ocrBreakdowns } = await serverSupabase
      .from('ocr_evaluations')
      .select('id, breakdown_json, feedback, category, title, temporary_file_key, report_file_key')
      .eq('class_id', classroomId)
      .eq('status', 'completed');
    if (ocrBreakdowns && ocrBreakdowns.length > 0) {
      const ocrMap = new Map();
      ocrBreakdowns.forEach(o => {
        ocrMap.set(o.id, o);
      });
      events.forEach(e => {
        if (e.activity_type === 'ocr' && ocrMap.has(e.id)) {
          const ocr = ocrMap.get(e.id);
          e.metadata = {
            ...(e.metadata || {}),
            breakdown_json: ocr.breakdown_json,
            feedback: ocr.feedback,
            original_r2_key: ocr.temporary_file_key,
            report_r2_key: ocr.report_file_key
          };
        }
      });
    }
  } catch (ocrErr) {
    console.warn('[Analytics] OCR breakdown enrichment notice:', ocrErr?.message);
  }

  // Enrich assignment / task events with detailed criteria breakdowns and writing evaluations
  let cachedTaskSubmissions = [];
  const tasksById = new Map();
  const examsById = new Map();
  let cachedExamResults = [];
  const liveQuizSessionsById = new Map();
  const liveQuizQuestionsById = new Map();
  let cachedLiveQuizAnswers = [];
  const challengesById = new Map();
  let cachedChallengeSubmissions = [];

  try {
    const { data: taskRows } = await serverSupabase
      .from('assignments')
      .select('id, title, topic, questions, due_date, status, analysis_status')
      .eq('classroom_id', classroomId);
    (taskRows || []).forEach(t => tasksById.set(t.id, t));
  } catch (e) {
    // Non-fatal if columns vary
  }

  try {
    const { data: subBreakdowns } = await serverSupabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, score, question_answers, text_response, file_urls, teacher_feedback, ocr_evaluation_id, submitted_at, status')
      .eq('classroom_id', classroomId)
      .in('status', ['graded', 'submitted', 'completed']);

    if (subBreakdowns && subBreakdowns.length > 0) {
      cachedTaskSubmissions = subBreakdowns;
      const subMap = new Map();
      subBreakdowns.forEach(sub => {
        let wEval = null;
        if (Array.isArray(sub.question_answers)) {
          const writingQa = sub.question_answers.find(qa => qa.writing_evaluation || qa.question_id === 'writing_response' || qa.question_id === 'ocr_handwritten_response');
          wEval = writingQa?.writing_evaluation;
        }
        subMap.set(sub.id, {
          sub,
          wEval,
          breakdown_json: wEval?.breakdown || [],
          topic: wEval?.topic,
          skills: wEval?.skills,
          mistakes: wEval?.mistakes,
          grammar_errors: wEval?.grammar_errors,
          spelling_errors: wEval?.spelling_errors,
          strengths: wEval?.strengths,
          corrected_work: wEval?.corrected_work,
          ocr_text: wEval?.ocr_text,
          feedback: sub.teacher_feedback || wEval?.feedback
        });
      });

      events.forEach(e => {
        if (e.activity_type === 'assignment' && subMap.has(e.id)) {
          const enriched = subMap.get(e.id);
          e.metadata = {
            ...(e.metadata || {}),
            breakdown_json: enriched.breakdown_json,
            writing_evaluation: enriched.wEval,
            question_answers: enriched.sub.question_answers,
            text_response: enriched.sub.text_response,
            file_urls: enriched.sub.file_urls,
            teacher_feedback: enriched.feedback,
            ocr_evaluation_id: enriched.sub.ocr_evaluation_id,
            corrected_work: enriched.corrected_work,
            ocr_text: enriched.ocr_text,
            grammar_errors: enriched.grammar_errors,
            spelling_errors: enriched.spelling_errors,
            mistakes: enriched.mistakes,
            strengths: enriched.strengths,
            feedback: enriched.feedback
          };
          if (enriched.topic && (!e.topic || e.topic === 'General' || e.topic === 'Assignment' || e.topic === 'Task')) {
            e.topic = enriched.topic;
          }
        }
      });
    }
  } catch (subErr) {
    console.warn('[Analytics] Assignment breakdown enrichment notice:', subErr?.message);
  }

  // Enrich Exams + Exam Results for Question-Level Skill Extraction
  try {
    const { data: examRows } = await serverSupabase
      .from('classroom_exams')
      .select('id, title, subject, questions, ends_at, status')
      .eq('classroom_id', classroomId);
    (examRows || []).forEach(ex => examsById.set(ex.id, ex));

    const { data: exResRows } = await serverSupabase
      .from('classroom_exam_results')
      .select('id, exam_id, student_id, score, max_score, percentage, answers, breakdown_json, submitted_at')
      .eq('classroom_id', classroomId);
    if (Array.isArray(exResRows)) {
      cachedExamResults = exResRows;
    }
  } catch (exErr) {
    console.warn('[Analytics] Exam question enrichment notice:', exErr?.message);
  }

  // Enrich Live Quizzes + Live Quiz Question Answers for Question-Level Skill Extraction
  try {
    const { data: lqSessions } = await serverSupabase
      .from('live_quiz_sessions')
      .select('id, title, topic, status, ended_at')
      .eq('classroom_id', classroomId);
    const sessionIds = (lqSessions || []).map(s => {
      liveQuizSessionsById.set(s.id, s);
      return s.id;
    });

    if (sessionIds.length > 0) {
      const [{ data: lqQuestions }, { data: lqAnswers }] = await Promise.all([
        serverSupabase
          .from('live_quiz_questions')
          .select('id, session_id, question_text, options, correct_option, explanation')
          .in('session_id', sessionIds),
        serverSupabase
          .from('live_quiz_answers')
          .select('id, session_id, question_id, student_id, selected_option, is_correct, submitted_at')
          .in('session_id', sessionIds)
      ]);
      (lqQuestions || []).forEach(q => liveQuizQuestionsById.set(q.id, q));
      if (Array.isArray(lqAnswers)) {
        cachedLiveQuizAnswers = lqAnswers;
      }
    }
  } catch (lqErr) {
    console.warn('[Analytics] Live Quiz question enrichment notice:', lqErr?.message);
  }

  // Enrich Competitions / AI Challenges
  try {
    const { data: chalRows } = await serverSupabase
      .from('ai_challenges')
      .select('id, title, topic, category, status, deadline_at')
      .eq('classroom_id', classroomId);
    (chalRows || []).forEach(c => challengesById.set(c.id, c));

    const { data: chalSubs } = await serverSupabase
      .from('ai_challenge_submissions')
      .select('id, challenge_id, student_id, content_text, total_score, ai_feedback, criteria_json, submitted_at')
      .eq('classroom_id', classroomId);
    if (Array.isArray(chalSubs)) {
      cachedChallengeSubmissions = chalSubs;
    }
  } catch (chErr) {
    console.warn('[Analytics] Challenge enrichment notice:', chErr?.message);
  }

  // Enrich from student_corrected_work if available
  try {
    const { data: cwList } = await serverSupabase
      .from('student_corrected_work')
      .select('submission_id, ai_evaluation_metadata, feedback_metadata, original_file_url, original_r2_key, corrected_file_url, corrected_r2_key, feedback_text')
      .eq('classroom_id', classroomId);

    if (cwList && cwList.length > 0) {
      const cwMap = new Map();
      cwList.forEach(cw => {
        if (cw.submission_id) {
          cwMap.set(cw.submission_id, cw);
        }
      });

      events.forEach(e => {
        if (e.activity_type === 'assignment' && cwMap.has(e.id)) {
          const cwItem = cwMap.get(e.id);
          const aiMeta = cwItem.ai_evaluation_metadata || {};
          const fbMeta = cwItem.feedback_metadata || {};
          e.metadata = {
            ...(e.metadata || {}),
            breakdown_json: aiMeta.breakdown || e.metadata?.breakdown_json,
            original_file_url: cwItem.original_file_url || e.metadata?.file_urls?.[0],
            original_r2_key: cwItem.original_r2_key,
            corrected_file_url: cwItem.corrected_file_url,
            corrected_r2_key: cwItem.corrected_r2_key,
            feedback_text: cwItem.feedback_text,
            feedback: cwItem.feedback_text || e.metadata?.feedback,
            corrected_work: fbMeta.corrected_work || e.metadata?.corrected_work,
            ocr_text: fbMeta.ocr_text || e.metadata?.ocr_text,
            original_text: fbMeta.original_text || e.metadata?.text_response,
            mistakes: fbMeta.mistakes || e.metadata?.mistakes,
            grammar_errors: fbMeta.grammar_errors || e.metadata?.grammar_errors,
            spelling_errors: fbMeta.spelling_errors || e.metadata?.spelling_errors,
            strengths: fbMeta.strengths || e.metadata?.strengths
          };
          if (aiMeta?.topic && (!e.topic || e.topic === 'General' || e.topic === 'Assignment' || e.topic === 'Task')) {
            e.topic = aiMeta.topic;
          }
        }
      });
    }
  } catch (cwErr) {
    console.warn('[Analytics] Corrected work enrichment notice:', cwErr?.message);
  }

  // Sort events chronologically (most recent first)
  events.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  // 3b. Build student name lookup map
  const studentNameMap = new Map();
  studentMembers.forEach(m => {
    const sid = m.profile_id || m.id;
    studentNameMap.set(sid, m.display_name || m.profile?.full_name || 'Student');
  });

  const SOURCE_LABEL_MAP = {
    assignment: 'Task',
    task: 'Task',
    live_quiz: 'Live Quiz',
    quiz: 'Live Quiz',
    exam: 'Assessment',
    assessment: 'Assessment',
    ocr: 'OCR',
    ai_challenge: 'Competition',
    competition: 'Competition'
  };

  // 3c. Normalize all learning events into a unified evidence model
  const normalizedEvents = events.map(e => {
    const hierarchy = extractConceptHierarchy(e);
    const rawType = e.activity_type;
    const normalizedType = 
      rawType === 'assignment' || rawType === 'task' ? 'task'
      : rawType === 'live_quiz' || rawType === 'quiz' ? 'live_quiz'
      : rawType === 'exam' || rawType === 'assessment' ? 'exam'
      : rawType === 'ocr' ? 'ocr'
      : rawType === 'ai_challenge' || rawType === 'competition' ? 'competition'
      : rawType || 'task';

    const sourceLabel = SOURCE_LABEL_MAP[rawType] || 'Task';
    const studentName = studentNameMap.get(e.student_id) || 'Student';
    const meta = e.metadata || {};

    return {
      ...e,
      id: e.id,
      activityId: e.activity_id || e.id,
      activityTitle: e.activity_title || (normalizedType === 'ocr' ? (e.topic || 'Worksheet Assessment') : 'Class Activity'),
      activityType: normalizedType,
      rawActivityType: rawType,
      sourceLabel,
      topic: hierarchy.topic,
      baseTopic: hierarchy.topic,
      skill: hierarchy.skill,
      category: hierarchy.category,
      displayName: hierarchy.displayName,
      rawTopic: e.topic || e.category || 'General',
      studentId: e.student_id,
      studentName,
      score: e.score != null ? Number(e.score) : null,
      maxScore: e.max_score != null ? Number(e.max_score) : null,
      percentage: e.percentage != null ? Number(e.percentage) : null,
      completedAt: e.completed_at,
      metadata: meta,
      feedback: meta.feedback || meta.teacher_feedback || meta.feedback_text || null,
      feedback_text: meta.feedback || meta.teacher_feedback || meta.feedback_text || null,
      teacher_feedback: meta.teacher_feedback || meta.feedback || null,
      original_work: meta.ocr_text || meta.original_text || meta.text_response || meta.content_text || null,
      original_text: meta.ocr_text || meta.original_text || meta.text_response || meta.content_text || null,
      text_response: meta.text_response || null,
      ocr_text: meta.ocr_text || null,
      corrected_work: meta.corrected_work || null,
      original_url: meta.original_file_url || (meta.file_urls && meta.file_urls[0]) || null,
      original_r2_key: meta.original_r2_key || meta.temporary_file_key || null,
      file_urls: meta.file_urls || [],
      grammar_errors: meta.grammar_errors || [],
      spelling_errors: meta.spelling_errors || [],
      mistakes: meta.mistakes || [],
      strengths: meta.strengths || [],
      breakdown: meta.breakdown_json || meta.breakdown || [],
      isPlaceholder: hierarchy.isPlaceholder
    };
  });

  // 3d. Analyze Spelling Evidence across OCR and Student Submissions with Word-Level Aggregation
  let specificSpellingDiagnoses = [];
  try {
    const wordErrorMap = new Map();

    events.forEach(e => {
      const structuredErrors = extractStructuredErrorsFromEvent(e);
      structuredErrors.forEach(err => {
        if (err.error_type === 'spelling' || err.category === 'Spelling') {
          const orig = (err.student_error || '').trim();
          const corr = (err.correct_form || err.target_word || '').trim();
          const targetWord = corr || orig;
          if (targetWord && targetWord.length >= 3) {
            const wordKey = targetWord.toLowerCase();
            if (!wordErrorMap.has(wordKey)) {
              wordErrorMap.set(wordKey, {
                targetWord,
                misspellings: new Map(),
                studentIds: new Set(),
                occurrences: 0
              });
            }
            const record = wordErrorMap.get(wordKey);
            record.occurrences += 1;
            if (e.student_id) record.studentIds.add(e.student_id);
            if (orig && orig.toLowerCase() !== wordKey) {
              record.misspellings.set(orig.toLowerCase(), (record.misspellings.get(orig.toLowerCase()) || 0) + 1);
            }
          }
        }
      });
    });

    for (const [wKey, data] of wordErrorMap.entries()) {
      if (data.occurrences >= 2 || data.studentIds.size >= 2) {
        const topMisspelling = Array.from(data.misspellings.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'misspelling';
        const accuracy = Math.max(30, Math.round(100 - (data.occurrences / Math.max(1, totalStudents)) * 25));
        const prio = calculateDeterministicPriority({
          affected_students: data.studentIds.size,
          total_students: totalStudents,
          accuracy,
          frequency: data.occurrences,
          sourcesCount: 1,
          ocrTasksCount: 1
        });

        specificSpellingDiagnoses.push({
          diagnosis_id: `diag_spelling_${wKey}`,
          category: 'spelling',
          skill: 'spelling',
          subskill: `spelling_${wKey}`,
          topic: 'Spelling',
          displayName: `Spelling — "${data.targetWord}"`,
          specific_problem: `Students repeatedly misspell "${data.targetWord}" (common error: "${topMisspelling}").`,
          affected_students: Math.min(data.studentIds.size, totalStudents),
          total_students: totalStudents,
          accuracy,
          frequency: data.occurrences,
          severity: accuracy < 50 ? 'high' : 'medium',
          confidence: (data.studentIds.size >= 2 || data.occurrences >= 3) ? 'confirmed' : 'early_signal',
          evidence_sources: ['OCR'],
          examples: [{ student_error: topMisspelling, correction: data.targetWord, correct_form: data.targetWord }],
          recommended_teaching: `Teach the spelling pattern in "${data.targetWord}" and use short retrieval practice in complete sentences.`,
          priority_score: prio,

          // Legacy fields
          studentCount: Math.min(data.studentIds.size, totalStudents),
          affectedStudentsCount: Math.min(data.studentIds.size, totalStudents),
          studentsAffected: Math.min(data.studentIds.size, totalStudents),
          studentsTotal: totalStudents,
          sources: ['OCR'],
          sourcesCount: 1,
          sourcesList: ['OCR'],
          commonErrors: [{ student_error: topMisspelling, correct_form: data.targetWord }],
          common_errors: [{ student_error: topMisspelling, correct_form: data.targetWord }],
          teachAction: `Teach the spelling pattern in "${data.targetWord}" and use short retrieval practice in complete sentences.`,
          recommended_action: `Teach the spelling pattern in "${data.targetWord}" and use short retrieval practice.`,
          why: `${data.studentIds.size} of ${totalStudents} students repeatedly misspell "${data.targetWord}" across OCR and writing tasks (${data.occurrences} occurrences).`,
          priority: prio
        });
      }
    }
  } catch (err) {
    console.warn('[Analytics] Spelling pattern analysis notice:', err?.message);
  }

  // 4. Scored & Valid Events
  const scoredEvents = normalizedEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
  const totalEvents = normalizedEvents.length;

  // Distinct completed activities
  const completedActivityIds = new Set(normalizedEvents.map(e => e.activity_id).filter(Boolean));
  const completedActivitiesCount = completedActivityIds.size;

  // Active students
  const activeStudentIds = new Set(normalizedEvents.map(e => e.student_id).filter(Boolean));
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
    const totalPossibleAttempts = completedActivitiesCount * totalStudents;
    completionRate = Number(Math.min(100, ((normalizedEvents.length / totalPossibleAttempts) * 100)).toFixed(2));
  }

  // 5. Compute sub-analytics
  const distinctDates = new Set(normalizedEvents.map(e => (e.completed_at || '').substring(0, 10)));
  const dataConfidence = evaluateDataConfidence(scoredEvents.length, completedActivitiesCount, distinctDates.size);

  const studentAnalytics = computeStudentAnalytics(normalizedEvents, studentMembers, {
    ...options,
    totalClassActivities: completedActivitiesCount
  });
  const activityBreakdown = computeActivityAnalytics(normalizedEvents, totalStudents);
  const topicAnalytics = computeTopicAnalytics(normalizedEvents, {
    ...options,
    totalStudents,
    classroomSubject: classroom.subject
  });
  const trendAnalytics = computeTrendAnalytics(normalizedEvents, totalStudents, options);

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

  // Filter meaningful topics that are not placeholders, not raw metadata, and have valid evidence
  const meaningfulTopics = topicAnalytics.filter(t => 
    !t.isPlaceholder && 
    t.eventCount > 0 && 
    t.displayName && 
    !/^(?:general|other|general task|task|assignment|grammar|spelling|writing|reading|vocabulary)$/i.test(t.displayName.trim()) &&
    !/session[-_]?id|final[-_]?rank|\{|\}/i.test(t.displayName)
  );

  // Top Strengths (Topics >= 75%)
  const topStrengths = meaningfulTopics
    .filter(t => t.averagePercentage != null && t.averagePercentage >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD)
    .slice(0, 5)
    .map(t => ({
      topic: t.displayName || t.topic,
      baseTopic: t.topic,
      skill: t.skill,
      averageScore: Math.round(t.averagePercentage),
      eventsCount: t.eventCount,
      status: t.status
    }));

  // Top Weaknesses (Topics < 60% or declining)
  const topWeaknesses = meaningfulTopics
    .filter(t => t.averagePercentage != null && (t.averagePercentage < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD || t.status === 'declining' || t.status === 'weak'))
    .slice(0, 5)
    .map(t => ({
      topic: t.displayName || t.topic,
      baseTopic: t.topic,
      skill: t.skill,
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

  // 6. Recent activity feed (up to 50 latest normalized events)
  const recentActivity = normalizedEvents.slice(0, 50).map(e => ({
    id: e.id,
    activityId: e.activityId || e.id,
    studentId: e.studentId,
    studentName: e.studentName || 'Student',
    activityType: e.activityType,
    rawActivityType: e.rawActivityType,
    sourceLabel: e.sourceLabel,
    activityTitle: e.activityTitle || 'Class Activity',
    topic: e.displayName || e.topic || 'General',
    baseTopic: e.baseTopic || e.topic,
    skill: e.skill,
    category: e.category,
    displayName: e.displayName,
    rawTopic: e.rawTopic,
    score: e.score,
    maxScore: e.maxScore,
    percentage: e.percentage,
    completedAt: e.completedAt,
    metadata: e.metadata || {}
  }));

  // 7. Grouped Recent Learning Evidence across 4 Sources
  const activityMap = new Map();
  for (const ev of normalizedEvents) {
    const actId = ev.activityId || ev.activity_id;
    if (!actId) continue;
    const actType = ev.activityType || ev.activity_type;
    const key = `${actType}:${actId}`;
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        activityId: actId,
        activityType: actType,
        rawActivityType: ev.rawActivityType || ev.activity_type,
        sourceLabel: ev.sourceLabel || 'Task',
        activityTitle: ev.activityTitle || 'Class Activity',
        topic: ev.displayName || ev.topic || 'General',
        baseTopic: ev.baseTopic || ev.topic,
        skill: ev.skill,
        category: ev.category,
        displayName: ev.displayName,
        events: []
      });
    }
    activityMap.get(key).events.push(ev);
  }

  const recentLearningEvidence = [];
  for (const [, grp] of activityMap.entries()) {
    const actEvents = grp.events;
    const scored = actEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const totalSubmissions = actEvents.length;
    const distinctStudents = new Set(actEvents.map(e => e.studentId || e.student_id).filter(Boolean));
    const studentsCount = distinctStudents.size;

    let averagePercentage = null;
    let highestScore = null;
    let lowestScore = null;
    let passCount = 0;
    let strongCount = 0;
    let weakCount = 0;

    if (scored.length > 0) {
      const sum = scored.reduce((s, e) => s + Number(e.percentage), 0);
      averagePercentage = Number((sum / scored.length).toFixed(1));
      const percentages = scored.map(e => Number(e.percentage));
      highestScore = Math.max(...percentages);
      lowestScore = Math.min(...percentages);
      passCount = scored.filter(e => Number(e.percentage) >= 50).length;
      strongCount = scored.filter(e => Number(e.percentage) >= ANALYTICS_CONFIG.STRONG_SCORE_THRESHOLD).length;
      weakCount = scored.filter(e => Number(e.percentage) < ANALYTICS_CONFIG.WEAK_SCORE_THRESHOLD).length;
    }

    const passRate = scored.length > 0
      ? Number(((passCount / scored.length) * 100).toFixed(1))
      : null;

    const latestDate = actEvents
      .map(e => e.completedAt || e.completed_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    let aiShortInsight = 'Not enough evidence yet.';
    let aiRecommendation = 'Not enough evidence yet.';

    if (averagePercentage != null && scored.length > 0) {
      if (averagePercentage < 60) {
        aiShortInsight = `Students are struggling with ${grp.topic} (averaging ${averagePercentage}%), with ${weakCount} student(s) below mastery threshold.`;
        aiRecommendation = `Review foundational concepts for ${grp.topic} with guided examples, then give students a short 5-minute practice activity.`;
      } else if (averagePercentage >= 75) {
        aiShortInsight = `Students demonstrated solid mastery in ${grp.topic} with a class average of ${averagePercentage}%.`;
        aiRecommendation = `Reinforce key takeaways and challenge students with progressive application questions.`;
      } else {
        aiShortInsight = `Students showed steady comprehension in ${grp.topic} with an average of ${averagePercentage}%.`;
        aiRecommendation = `Clarify common misconceptions observed during the activity before moving to the next unit.`;
      }
    }

    recentLearningEvidence.push({
      activityId: grp.activityId,
      activityType: grp.activityType,
      rawActivityType: grp.rawActivityType,
      sourceLabel: grp.sourceLabel,
      activityTitle: grp.activityTitle,
      topic: grp.topic,
      baseTopic: grp.baseTopic,
      skill: grp.skill,
      category: grp.category,
      displayName: grp.displayName,
      submissionsCount: totalSubmissions,
      studentsCount,
      averagePercentage,
      passRate,
      highestScore,
      lowestScore,
      performanceDistribution: {
        strong: strongCount,
        steady: scored.length - strongCount - weakCount,
        weak: weakCount
      },
      latestCompletedAt: latestDate,
      aiShortInsight,
      aiRecommendation,
      studentResults: actEvents.slice(0, 30).map(e => ({
        studentId: e.studentId || e.student_id,
        studentName: e.studentName || studentNameMap.get(e.studentId || e.student_id) || 'Student',
        score: e.score != null ? Number(e.score) : null,
        percentage: e.percentage != null ? Number(e.percentage) : null,
        completedAt: e.completedAt || e.completed_at
      }))
    });
  }

  recentLearningEvidence.sort((a, b) => {
    const timeA = a.latestCompletedAt ? new Date(a.latestCompletedAt).getTime() : 0;
    const timeB = b.latestCompletedAt ? new Date(b.latestCompletedAt).getTime() : 0;
    return timeB - timeA;
  });

  // 8. Visual Weak Area Identification
  const sortedTopics = [...(meaningfulTopics || [])].sort((a, b) => (a.averagePercentage ?? 100) - (b.averagePercentage ?? 100));
  const identifiedWeakArea = sortedTopics.find(t => t.averagePercentage != null && t.averagePercentage < 65) || null;

  const weakAreaVisualData = {
    hasWeakArea: Boolean(identifiedWeakArea),
    weakestTopic: identifiedWeakArea ? identifiedWeakArea.topic : null,
    weakestScore: identifiedWeakArea ? Math.round(identifiedWeakArea.averagePercentage) : null,
    topicsComparison: sortedTopics.slice(0, 6).map(t => ({
      topic: t.displayName || t.topic,
      score: t.averagePercentage != null ? Math.round(t.averagePercentage) : 0,
      isWeak: identifiedWeakArea ? t.topic === identifiedWeakArea.topic : false
    })),
    shortAnalysis: identifiedWeakArea
      ? `Your students are struggling with ${identifiedWeakArea.displayName || identifiedWeakArea.topic} (${Math.round(identifiedWeakArea.averagePercentage)}% accuracy).`
      : (sortedTopics.length > 0 ? 'All assessed topic areas are currently performing at or above baseline.' : 'Not enough evidence yet.'),
    recommendation: identifiedWeakArea
      ? `Review core principles of ${identifiedWeakArea.displayName || identifiedWeakArea.topic} with direct modeling, then give students a focused practice task.`
      : (sortedTopics.length > 0 ? 'Continue regular progressive assessments to track topic growth.' : 'Not enough evidence yet.')
  };

  // 9. Chronological Performance Over Time Calculation
  const performanceOverTime = computePerformanceOverTime(normalizedEvents);

  // 10. Evidence Summary Counts across all 5 Sources
  const evidenceSummaryCounts = {
    ocr: normalizedEvents.filter(e => e.activityType === 'ocr' || e.rawActivityType === 'ocr').length,
    tasks: normalizedEvents.filter(e => e.activityType === 'task' || e.rawActivityType === 'assignment').length,
    live_quizzes: normalizedEvents.filter(e => e.activityType === 'live_quiz' || e.rawActivityType === 'quiz').length,
    exams: normalizedEvents.filter(e => e.activityType === 'exam' || e.rawActivityType === 'assessment').length,
    competitions: normalizedEvents.filter(e => e.activityType === 'competition' || e.rawActivityType === 'ai_challenge').length,
    total: normalizedEvents.length
  };

  // 11. BUILD SPECIFIC QUESTION-LEVEL DIAGNOSES (DEDUPLICATED, UP TO 10 DISTINCT SKILLS, RANKED BY AFFECTED STUDENTS & PRIORITY)
  const questionLevelDiagnoses = buildQuestionLevelSkillDiagnoses({
    normalizedEvents,
    examResults: cachedExamResults,
    examsById,
    taskSubmissions: cachedTaskSubmissions,
    tasksById,
    liveQuizAnswers: cachedLiveQuizAnswers,
    liveQuizQuestionsById,
    liveQuizSessionsById,
    challengeSubmissions: cachedChallengeSubmissions,
    challengesById,
    totalStudents,
    classroomSubject: classroom.subject
  });

  const candidateDiagnosesMap = new Map();

  // First add granular question-level / error-level diagnoses
  questionLevelDiagnoses.forEach(d => {
    const diagKey = d.diagnosis_id || d.displayName;
    if (!candidateDiagnosesMap.has(diagKey)) {
      candidateDiagnosesMap.set(diagKey, d);
    }
  });

  // Add meaningful topic weaknesses that were not already captured by questionLevelDiagnoses
  meaningfulTopics
    .filter(t => t.averagePercentage != null && (t.averagePercentage < 70 || t.affected_students >= 1 || t.affectedStudentsCount >= 1))
    .forEach(t => {
      const diagKey = t.diagnosis_id || t.displayName || t.topic;
      if (!candidateDiagnosesMap.has(diagKey)) {
        const canonicalObj = normalizeCanonicalConcept(t.displayName) || normalizeCanonicalConcept(t.topic);
        const studentsAssessed = Math.max(t.affected_students || 1, t.participatingStudentsCount || 1);
        const affectedStudentCount = Math.min(studentsAssessed, t.affected_students || t.affectedStudentsCount || 1);
        const affectedPercentage = Math.round((affectedStudentCount / Math.max(1, studentsAssessed)) * 100);
        const accuracyPercentage = t.accuracy ?? Math.round(t.averagePercentage ?? 0);
        const errorOccurrenceCount = Math.max(1, t.frequency || affectedStudentCount);
        const totalOpportunities = Math.max(t.eventCount || 1, errorOccurrenceCount);
        const evidenceSources = t.evidence_sources || t.sourcesList || ['Tasks'];

        candidateDiagnosesMap.set(diagKey, {
          ...t,
          diagnosis_id: diagKey,
          category: canonicalObj?.category || t.category || 'Grammar',
          topic: canonicalObj?.topic || t.topic || 'Grammar',
          skill: canonicalObj?.skill || t.skill || 'core_concept',
          subskill: canonicalObj?.subskill || t.subskill || 'core_subskill',
          displayName: canonicalObj?.displayName || t.displayName || t.topic,
          observedErrorPattern: t.specific_problem || `${affectedStudentCount} of ${studentsAssessed} assessed students (${affectedPercentage}%) struggled with ${t.displayName || t.topic}.`,
          specific_problem: t.specific_problem || `${affectedStudentCount} of ${studentsAssessed} assessed students (${affectedPercentage}%) struggled with ${t.displayName || t.topic}.`,
          affectedStudentCount,
          affected_students: affectedStudentCount,
          affected_students_count: affectedStudentCount,
          studentsAssessed,
          students_assessed: studentsAssessed,
          affectedPercentage,
          affected_percentage: affectedPercentage,
          accuracyPercentage,
          accuracy: accuracyPercentage,
          errorOccurrenceCount,
          frequency: errorOccurrenceCount,
          totalOpportunities,
          total_opportunities: totalOpportunities,
          evidenceSources,
          evidence_sources: evidenceSources,
          evidenceIds: t.evidenceIds || [],
          evidence_ids: t.evidenceIds || [],
          recommendedTeachingAction: t.recommended_teaching || canonicalObj?.recommended_teaching || t.teachAction,
          recommended_teaching: t.recommended_teaching || canonicalObj?.recommended_teaching || t.teachAction,
          followUpActivity: canonicalObj?.follow_up_activity || `Complete a 5-item guided practice check targeting ${t.displayName || t.topic}.`,
          follow_up_activity: canonicalObj?.follow_up_activity || `Complete a 5-item guided practice check targeting ${t.displayName || t.topic}.`,
          reassessmentMethod: canonicalObj?.reassessment_method || `Administer a short 5-question exit check on ${t.displayName || t.topic}.`,
          reassessment_method: canonicalObj?.reassessment_method || `Administer a short 5-question exit check on ${t.displayName || t.topic}.`
        });
      }
    });

  // Add specific spelling diagnoses (e.g. Spelling — "because")
  specificSpellingDiagnoses.forEach(spDiag => {
    if (!candidateDiagnosesMap.has(spDiag.diagnosis_id) && !candidateDiagnosesMap.has(spDiag.displayName)) {
      const studentsAssessed = Math.max(spDiag.affected_students || 1, activeStudents || totalStudents || 1);
      const affectedStudentCount = spDiag.affected_students || 1;
      const affectedPercentage = Math.round((affectedStudentCount / Math.max(1, studentsAssessed)) * 100);
      candidateDiagnosesMap.set(spDiag.diagnosis_id, {
        ...spDiag,
        observedErrorPattern: spDiag.specific_problem,
        affectedStudentCount,
        affected_students_count: affectedStudentCount,
        studentsAssessed,
        students_assessed: studentsAssessed,
        affectedPercentage,
        affected_percentage: affectedPercentage,
        accuracyPercentage: spDiag.accuracy,
        errorOccurrenceCount: spDiag.frequency,
        totalOpportunities: Math.max(spDiag.frequency, studentsAssessed),
        evidenceSources: spDiag.evidence_sources || ['Tasks'],
        evidenceIds: [],
        recommendedTeachingAction: spDiag.recommended_teaching,
        followUpActivity: `Write 4 complete sentences using the target word after a Look-Say-Cover-Write check.`,
        follow_up_activity: `Write 4 complete sentences using the target word after a Look-Say-Cover-Write check.`,
        reassessmentMethod: `Administer a 5-word contextual spelling dictation check.`,
        reassessment_method: `Administer a 5-word contextual spelling dictation check.`
      });
    }
  });

  // Strictly deduplicate and retain up to 10 distinct skill diagnoses for the Horizontal Bar Chart & Diagnosis Cards
  const allDiagnoses = Array.from(candidateDiagnosesMap.values())
    .sort(
      (a, b) =>
        (b.affectedStudentCount ?? b.affected_students ?? 0) -
          (a.affectedStudentCount ?? a.affected_students ?? 0) ||
        (b.priority_score ?? b.priority ?? 0) - (a.priority_score ?? a.priority ?? 0) ||
        (a.accuracyPercentage ?? a.accuracy ?? 100) - (b.accuracyPercentage ?? b.accuracy ?? 100)
    )
    .slice(0, 10);

  const learningGapPriority = allDiagnoses;

  // 12. COMPUTE CLASS PERFORMANCE DISTRIBUTION (Excellent, Good, Pretty, Bad, unclassified)
  const performanceDistribution = computePerformanceDistribution(studentAnalytics, totalStudents);

  // Deduplicated Class Strengths (accuracy >= 75%)
  const strengthMap = new Map();
  meaningfulTopics
    .filter(t => t.averagePercentage != null && t.averagePercentage >= 75 && t.eventCount >= 1)
    .forEach(t => {
      const key = t.displayName || t.topic;
      if (!strengthMap.has(key)) {
        strengthMap.set(key, {
          topic: t.displayName || t.topic,
          baseTopic: t.topic,
          skill: t.skill,
          category: t.category,
          displayName: t.displayName || t.topic,
          accuracy: Math.round(t.averagePercentage),
          averagePercentage: Math.round(t.averagePercentage),
          eventCount: t.eventCount,
          eventsCount: t.eventCount,
          sourcesCount: t.sourcesCount,
          sources: t.sourcesList,
          sourcesList: t.sourcesList
        });
      }
    });
  const classStrengths = Array.from(strengthMap.values()).sort((a, b) => b.accuracy - a.accuracy).slice(0, 6);

  // Students Needing Support (Scores < 70%) with linked primary and secondary diagnoses
  const studentsNeedingSupport = studentAnalytics
    .filter(s => s.averagePercentage != null && s.averagePercentage < 70)
    .map(s => {
      const studentWeakAreas = s.weakAreas || [];
      const weakConceptNames = studentWeakAreas.length > 0
        ? studentWeakAreas.map(w => w.displayName || w.topic)
        : (s.averagePercentage < 50 ? ['Foundational Core Practice'] : ['Targeted Concept Review']);

      // Link to primary and secondary diagnosed problems
      let primaryDiag = null;
      let secondaryDiag = null;

      if (studentWeakAreas.length > 0) {
        const topWeakName = studentWeakAreas[0].displayName || studentWeakAreas[0].topic;
        primaryDiag = allDiagnoses.find(d => d.displayName === topWeakName || d.topic === topWeakName) || { displayName: topWeakName };
        if (studentWeakAreas.length > 1) {
          const secondWeakName = studentWeakAreas[1].displayName || studentWeakAreas[1].topic;
          secondaryDiag = allDiagnoses.find(d => d.displayName === secondWeakName || d.topic === secondWeakName) || { displayName: secondWeakName };
        }
      } else if (allDiagnoses.length > 0) {
        primaryDiag = allDiagnoses[0];
        if (allDiagnoses.length > 1) secondaryDiag = allDiagnoses[1];
      }

      return {
        studentId: s.studentId,
        studentName: s.fullName || studentNameMap.get(s.studentId) || 'Student',
        fullName: s.fullName || studentNameMap.get(s.studentId) || 'Student',
        email: s.email,
        avatarUrl: s.avatarUrl,
        averagePercentage: s.averagePercentage,
        trend: s.scoreChangePercentagePoints != null
          ? `${s.scoreChangePercentagePoints >= 0 ? '+' : ''}${s.scoreChangePercentagePoints}%`
          : (s.trend || 'Steady'),
        primary_diagnosis: primaryDiag ? primaryDiag.displayName : (weakConceptNames[0] || 'Foundational Review'),
        secondary_diagnosis: secondaryDiag ? secondaryDiag.displayName : (weakConceptNames[1] || null),
        weakAreas: studentWeakAreas,
        specificWeakConcepts: weakConceptNames,
        totalEvents: s.totalEvents,
        performanceCategory: s.performanceCategory,
        performanceCategoryLabel: s.performanceCategoryLabel
      };
    })
    .sort((a, b) => (a.averagePercentage ?? 0) - (b.averagePercentage ?? 0));

  // #1 Highest Priority Diagnosis / Recommended Teaching Focus
  const topDiagnosis = allDiagnoses[0] || null;
  const recommendedTeachingFocus = topDiagnosis ? {
    diagnosis_id: topDiagnosis.diagnosis_id,
    category: topDiagnosis.category,
    skill: topDiagnosis.skill,
    subskill: topDiagnosis.subskill,
    topic: topDiagnosis.topic,
    baseTopic: topDiagnosis.baseTopic || topDiagnosis.topic,
    displayName: topDiagnosis.displayName,
    specific_problem: topDiagnosis.specific_problem,
    accuracy: topDiagnosis.accuracy ?? topDiagnosis.averageAccuracy,
    studentsAffected: topDiagnosis.affected_students ?? topDiagnosis.studentsAffected,
    studentCount: topDiagnosis.affected_students ?? topDiagnosis.studentCount,
    studentsTotal: totalStudents,
    totalStudents: totalStudents,
    sourcesCount: topDiagnosis.sourcesCount || topDiagnosis.evidence_sources?.length || 1,
    sourcesList: topDiagnosis.sourcesList || topDiagnosis.evidence_sources || ['Task'],
    confidence: topDiagnosis.confidence,
    examples: topDiagnosis.examples || topDiagnosis.commonErrors,
    commonErrors: topDiagnosis.examples || topDiagnosis.commonErrors,
    teachAction: topDiagnosis.recommended_teaching || topDiagnosis.teachAction,
    recommended_teaching: topDiagnosis.recommended_teaching || topDiagnosis.teachAction,
    recommended_action: topDiagnosis.recommended_teaching || topDiagnosis.teachAction,
    why: topDiagnosis.why || `Class accuracy is ${topDiagnosis.accuracy}% with ${topDiagnosis.affected_students} of ${totalStudents} students affected.`,
    priority_score: topDiagnosis.priority_score ?? topDiagnosis.priority ?? 0.85
  } : null;

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
    recentLearningEvidence: normalizedEvents,
    allEvidence: normalizedEvents,
    all_evidence: normalizedEvents,
    groupedEvidence: recentLearningEvidence,
    grouped_evidence: recentLearningEvidence,
    evidenceSummaryCounts,
    evidence_summary_counts: evidenceSummaryCounts,
    spellingDiagnosis: specificSpellingDiagnoses[0] || null,
    spelling_diagnosis: specificSpellingDiagnoses[0] || null,
    specificSpellingDiagnoses,
    weakAreaVisualData,
    students: studentAnalytics,
    activityBreakdown,
    topics: meaningfulTopics.slice(0, 10), // Maximum 10 bars for Class Performance
    trends: trendAnalytics,
    dataConfidence,
    calculatedAt: new Date().toISOString(),
    diagnoses: allDiagnoses, // Up to 10 Ranked Specific Skill Diagnoses
    learningGapPriority: allDiagnoses,
    performanceDistribution,
    performance_distribution: performanceDistribution,
    classStrengths,
    studentsNeedingSupport,
    recommendedTeachingFocus,
    primaryDiagnosis: recommendedTeachingFocus,
    performanceOverTime,
    performance_over_time: performanceOverTime,
    trendData: performanceOverTime
  };
}

