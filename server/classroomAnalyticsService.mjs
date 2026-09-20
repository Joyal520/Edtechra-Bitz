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

export function normalizeConcept(rawTopic) {
  if (!rawTopic) return 'General';
  let topic = rawTopic.trim();
  // Remove 'assignment' literal fallback
  if (topic.toLowerCase() === 'assignment' || topic.toLowerCase() === 'task') return 'General Task';
  return topic;
}

/**
 * Normalizes an educational activity into Category -> Topic -> Skill hierarchy.
 * Extracts granular teaching concepts from titles, topics, and rubric metadata.
 * @param {Object} ev - Learning event object
 * @returns {{ category: string, topic: string, skill: string, displayName: string, isPlaceholder: boolean }}
 */
export function extractConceptHierarchy(ev) {
  if (!ev) {
    return { category: 'General', topic: 'General', skill: 'Core Concepts', displayName: 'General', isPlaceholder: true };
  }
  const rawTopic = (ev.topic || '').trim();
  const rawTitle = (ev.activity_title || '').trim();
  const category = (ev.category || '').trim();
  const metaText = ev.metadata ? (typeof ev.metadata === 'string' ? ev.metadata : JSON.stringify(ev.metadata)) : '';
  const combined = `${rawTitle} ${rawTopic} ${metaText}`.trim();

  // 1. Recognized pedagogical topics and concepts (check first before generic colon splitting)
  if (/simple past/i.test(combined)) {
    const isNeg = /negative|did\s*not|didn't/i.test(combined);
    return {
      category: 'Grammar',
      topic: 'Simple Past',
      skill: isNeg ? 'Negative Forms' : 'Past Tense Forms',
      displayName: isNeg ? 'Simple Past — Negative Forms' : 'Simple Past — Past Tense Forms',
      isPlaceholder: false
    };
  }

  if (/simple present/i.test(combined)) {
    const isNeg = /negative|does\s*not|doesn't|do\s*not|don't|not\s+like/i.test(combined);
    return {
      category: 'Grammar',
      topic: 'Simple Present',
      skill: isNeg ? 'Negative Forms' : 'Affirmative & Questions',
      displayName: isNeg ? 'Simple Present — Negative Forms' : 'Simple Present — Affirmative & Questions',
      isPlaceholder: false
    };
  }

  if (/preposition/i.test(combined) || /at.*in.*on/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Prepositions',
      skill: 'at / in / on',
      displayName: 'Prepositions — at / in / on',
      isPlaceholder: false
    };
  }

  if (/conjunction/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Conjunctions',
      skill: 'Connecting Clauses (and/but/so/or)',
      displayName: 'Conjunctions — Connecting Clauses',
      isPlaceholder: false
    };
  }

  if (/am,\s*is,\s*are|was,\s*were|be verbs/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Be Verbs',
      skill: 'am / is / are / was / were',
      displayName: 'Be Verbs — am / is / are / was / were',
      isPlaceholder: false
    };
  }

  if (/paragraph writing/i.test(combined) || category === 'Paragraph Writing') {
    return {
      category: 'Writing',
      topic: 'Paragraph Writing',
      skill: 'Organization & Flow',
      displayName: 'Paragraph Writing — Organization & Flow',
      isPlaceholder: false
    };
  }

  if (/essay writing/i.test(combined) || category === 'Essay Writing') {
    return {
      category: 'Writing',
      topic: 'Essay Writing',
      skill: 'Structure & Development',
      displayName: 'Essay Writing — Structure & Development',
      isPlaceholder: false
    };
  }

  if (/story writing/i.test(combined) || /mermaids/i.test(combined) || category === 'Story Writing' || category === 'competition') {
    return {
      category: 'Writing',
      topic: 'Creative Story Writing',
      skill: 'Narrative Development',
      displayName: 'Creative Writing — Narrative Development',
      isPlaceholder: false
    };
  }

  if (/animal facts|general knowledge/i.test(combined)) {
    return {
      category: 'Reading',
      topic: 'Reading Comprehension',
      skill: 'Factual Recall & Context',
      displayName: 'Reading Comprehension — Factual Recall',
      isPlaceholder: false
    };
  }

  // 2. Explicit separator: "Topic — Skill", "Topic: Skill", "Topic - Skill", "Topic – Skill"
  for (const sep of [' — ', ' – ', ' : ', ': ', ' - ']) {
    if (combined.includes(sep)) {
      const parts = combined.split(sep);
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        const top = parts[0].trim().replace(/^(Unit Test on the|Unit Test on|Quiz on|Assessment:|Test on)\s*/i, '');
        const skl = parts[1].trim();
        let cat = 'Grammar';
        if (/writing|paragraph|essay|story/i.test(top) || /writing|paragraph|essay|story/i.test(skl)) cat = 'Writing';
        else if (/reading|comprehension/i.test(top) || /reading|comprehension/i.test(skl)) cat = 'Reading';
        else if (/vocabulary/i.test(top) || /vocabulary/i.test(skl)) cat = 'Vocabulary';
        return {
          category: cat,
          topic: top,
          skill: skl,
          displayName: `${top} — ${skl}`,
          isPlaceholder: false
        };
      }
    }
  }

  // Check for placeholder/empty topics to omit
  const lower = (rawTopic || rawTitle || '').toLowerCase().trim();
  if (!lower || lower === 'other' || lower === 'general task' || lower === 'assignment' || lower === 'task' || lower === 'science') {
    return {
      category: 'General',
      topic: rawTopic || 'General',
      skill: 'General Review',
      displayName: rawTopic || 'General',
      isPlaceholder: true
    };
  }

  const cleanTopic = normalizeConcept(rawTopic || rawTitle);
  return {
    category: category || 'General',
    topic: cleanTopic,
    skill: 'Core Comprehension',
    displayName: `${cleanTopic} — Core Concepts`,
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

    const hierarchy = extractConceptHierarchy(ev);
    const key = hierarchy.displayName;

    if (!topicGroups.has(key)) {
      topicGroups.set(key, {
        key,
        topic: hierarchy.topic,
        skill: hierarchy.skill,
        displayName: hierarchy.displayName,
        category: hierarchy.category,
        isPlaceholder: hierarchy.isPlaceholder,
        events: []
      });
    }
    topicGroups.get(key).events.push(ev);

    // If event has detailed rubric criteria breakdown (e.g. from OCR or AI challenges)
    const breakdown = Array.isArray(ev.metadata?.breakdown_json) ? ev.metadata.breakdown_json : [];
    for (const crit of breakdown) {
      if (!crit || !crit.criterion || crit.max <= 0 || crit.score == null) continue;
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
        parentTopic = 'Punctuation';
        parentCat = 'Grammar';
      } else if (/clarity|flow|organization/i.test(critName)) {
        parentTopic = 'Paragraph Organization';
        parentCat = 'Writing';
      } else if (/vocabulary|word choice/i.test(critName)) {
        parentTopic = 'Vocabulary';
        parentCat = 'Vocabulary';
      }

      const critKey = `${parentTopic} — ${critName}`;
      if (!topicGroups.has(critKey)) {
        topicGroups.set(critKey, {
          key: critKey,
          topic: parentTopic,
          skill: critName,
          displayName: critKey,
          category: parentCat,
          isPlaceholder: false,
          events: []
        });
      }
      topicGroups.get(critKey).events.push({
        ...ev,
        percentage: critPct,
        topic: parentTopic
      });
    }
  }

  const topicRecords = [];

  for (const [key, group] of topicGroups.entries()) {
    const topicEvents = group.events;
    const scoredEvents = topicEvents.filter(e => e.percentage != null && !isNaN(Number(e.percentage)));
    const eventCount = scoredEvents.length;
    const participatingStudents = new Set(scoredEvents.map(e => e.student_id).filter(Boolean));

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

    // Friendly source tracking
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

    // Count distinct students who have average score < 70 on this topic
    let affectedStudentsCount = 0;
    for (const [, st] of studentScoreSums.entries()) {
      if ((st.sum / st.count) < 70) {
        affectedStudentsCount += 1;
      }
    }
    if (options.totalStudents > 0) {
      affectedStudentsCount = Math.min(affectedStudentsCount, options.totalStudents);
    }

    const sourcesCount = distinctSources.size;
    const sourcesList = Array.from(friendlySourcesSet);

    let confidence = 'DEVELOPING';
    if (sourcesCount >= 2 && (averagePercentage != null && averagePercentage < 70)) confidence = 'CONFIRMED GAP';
    else if (sourcesCount < 2 && (averagePercentage != null && averagePercentage < 70)) confidence = 'EARLY SIGNAL';
    else if (averagePercentage != null && averagePercentage >= 75) confidence = 'STRONG';

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
      topic: group.topic,
      skill: group.skill,
      displayName: group.displayName,
      category: group.category,
      isPlaceholder: group.isPlaceholder,
      eventCount,
      averagePercentage,
      score: averagePercentage != null ? Math.round(averagePercentage) : 0,
      participatingStudentsCount: participatingStudents.size,
      affectedStudentsCount,
      scoreChangePercentagePoints: scoreChange,
      status,
      confidence,
      confidenceLabel: sourcesCount >= 2 ? `CONFIRMED GAP • ${sourcesCount} evidence sources` : 'EARLY SIGNAL • 1 evidence source',
      sources: sourcesList,
      sourcesCount,
      sourcesList,
      evidence: evidenceList,
      evidenceBreakdown
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

  // Enrich OCR events with detailed criteria breakdowns for granular skill evidence
  try {
    const { data: ocrBreakdowns } = await serverSupabase
      .from('ocr_evaluations')
      .select('id, breakdown_json')
      .eq('class_id', classroomId)
      .eq('status', 'completed');
    if (ocrBreakdowns && ocrBreakdowns.length > 0) {
      const ocrMap = new Map();
      ocrBreakdowns.forEach(o => {
        if (o.breakdown_json) ocrMap.set(o.id, o.breakdown_json);
      });
      events.forEach(e => {
        if (e.activity_type === 'ocr' && ocrMap.has(e.id)) {
          e.metadata = { ...(e.metadata || {}), breakdown_json: ocrMap.get(e.id) };
        }
      });
    }
  } catch (ocrErr) {
    console.warn('[Analytics] OCR breakdown enrichment notice:', ocrErr?.message);
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
      metadata: e.metadata || {},
      isPlaceholder: hierarchy.isPlaceholder
    };
  });

  // 3d. Analyze Spelling Evidence across OCR and Student Submissions
  let spellingDiagnosis = null;
  try {
    let totalSpellingEarned = 0;
    let totalSpellingMax = 0;
    const spellingAffectedStudents = new Set();
    const recurringSpellingErrors = [];

    events.forEach(e => {
      const breakdown = Array.isArray(e.metadata?.breakdown_json) ? e.metadata.breakdown_json : [];
      for (const crit of breakdown) {
        if (/spelling/i.test(crit.criterion || crit.name)) {
          const sScore = Number(crit.score) || 0;
          const sMax = Number(crit.max) || 0;
          if (sMax > 0) {
            totalSpellingEarned += sScore;
            totalSpellingMax += sMax;
            if ((sScore / sMax) < 0.70 && e.student_id) {
              spellingAffectedStudents.add(e.student_id);
            }
          }
        }
      }
    });

    const spellingAccuracy = totalSpellingMax > 0
      ? Math.round((totalSpellingEarned / totalSpellingMax) * 100)
      : null;

    if (totalSpellingMax > 0 && spellingAccuracy != null) {
      spellingDiagnosis = {
        category: 'Spelling',
        topic: 'Spelling',
        skill: recurringSpellingErrors.length > 0 
          ? recurringSpellingErrors.map(err => `${err.correct} → ${err.incorrect}`).join(' • ')
          : 'Common Error Patterns',
        displayName: 'Spelling — Common Errors',
        accuracy: spellingAccuracy,
        studentCount: Math.min(spellingAffectedStudents.size, totalStudents),
        totalStudents,
        sources: ['OCR'],
        sourcesCount: 1,
        confidence: 'Early signal',
        commonErrors: recurringSpellingErrors,
        hasSpecificWords: recurringSpellingErrors.length > 0,
        why: recurringSpellingErrors.length > 0
          ? `${spellingAffectedStudents.size} of ${totalStudents} students affected by recurring spelling patterns.`
          : (spellingAccuracy < 70
              ? `Spelling accuracy is ${spellingAccuracy}% across ${spellingAffectedStudents.size} of ${totalStudents} students. Not enough spelling samples yet to list recurring words.`
              : 'Spelling performance is steady. Not enough error samples to report.'),
        recommended_action: 'Conduct a targeted 10-minute spelling patterns practice with error-contrast flashcards.'
      };
    }
  } catch (err) {
    console.warn('[Analytics] Spelling diagnosis notice:', err?.message);
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
    // If measurable against total student capacity
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
  const topicAnalytics = computeTopicAnalytics(normalizedEvents, { ...options, totalStudents });
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

  // Filter meaningful topics that are not placeholders and have evidence
  const meaningfulTopics = topicAnalytics.filter(t => !t.isPlaceholder && t.eventCount > 0);

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

  // 7. Grouped Recent Learning Evidence (Unified across 4 Sources: Tasks, Quizzes, Assessments, Competitions)
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
  for (const [key, grp] of activityMap.entries()) {
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

    // Factual Short AI Analysis & Recommendation based strictly on computed results
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

  // Sort by latest completed date
  recentLearningEvidence.sort((a, b) => {
    const timeA = a.latestCompletedAt ? new Date(a.latestCompletedAt).getTime() : 0;
    const timeB = b.latestCompletedAt ? new Date(b.latestCompletedAt).getTime() : 0;
    return timeB - timeA;
  });

  // 8. Visual Weak Area Identification (Example: Simple Past Negative 38% vs Positive 76%)
  const sortedTopics = [...(topicAnalytics || [])].sort((a, b) => (a.averagePercentage ?? 100) - (b.averagePercentage ?? 100));
  const identifiedWeakArea = sortedTopics.find(t => t.averagePercentage != null && t.averagePercentage < 65) || null;

  const weakAreaVisualData = {
    hasWeakArea: Boolean(identifiedWeakArea),
    weakestTopic: identifiedWeakArea ? identifiedWeakArea.topic : null,
    weakestScore: identifiedWeakArea ? Math.round(identifiedWeakArea.averagePercentage) : null,
    topicsComparison: sortedTopics.slice(0, 6).map(t => ({
      topic: t.topic,
      score: t.averagePercentage != null ? Math.round(t.averagePercentage) : 0,
      isWeak: identifiedWeakArea ? t.topic === identifiedWeakArea.topic : false
    })),
    shortAnalysis: identifiedWeakArea
      ? `Your students are struggling with ${identifiedWeakArea.topic} (${Math.round(identifiedWeakArea.averagePercentage)}% accuracy).`
      : (sortedTopics.length > 0 ? 'All assessed topic areas are currently performing at or above baseline.' : 'Not enough evidence yet.'),
    recommendation: identifiedWeakArea
      ? `Review core principles of ${identifiedWeakArea.topic} with direct modeling, then give students a focused practice task.`
      : (sortedTopics.length > 0 ? 'Continue regular progressive assessments to track topic growth.' : 'Not enough evidence yet.')
  };

  // 9. Chronological Performance Over Time Calculation
  const performanceOverTime = computePerformanceOverTime(normalizedEvents);

  // 10. Granular Learning Gap Priority (Ranked by affected students and multi-source confidence)
  const learningGapPriority = meaningfulTopics
    .filter(t => t.averagePercentage != null && (t.averagePercentage < 70 || t.affectedStudentsCount >= 2))
    .map(t => {
      const affectedRatio = totalStudents > 0 ? (t.affectedStudentsCount / totalStudents) : 0.5;
      const isMultiSource = t.sourcesCount >= 2;
      const priority = Number(((affectedRatio) * (100 - t.averagePercentage) * (isMultiSource ? 1.5 : 1.0)).toFixed(2));
      return {
        ...t,
        category: t.category || 'General',
        topic: t.displayName || t.topic,
        baseTopic: t.topic,
        skill: t.skill,
        displayName: t.displayName || t.topic,
        accuracy: Math.round(t.averagePercentage),
        averageAccuracy: Math.round(t.averagePercentage),
        average_accuracy: Math.round(t.averagePercentage),
        studentCount: t.affectedStudentsCount,
        affectedStudentsCount: t.affectedStudentsCount,
        students_affected: t.affectedStudentsCount,
        studentsAffected: t.affectedStudentsCount,
        totalStudents: totalStudents,
        students_total: totalStudents,
        studentsTotal: totalStudents,
        sources: Array.isArray(t.sourcesList) && t.sourcesList.length > 0 ? t.sourcesList : (t.sources || ['Assessment']),
        sourcesCount: t.sourcesCount,
        sourcesList: t.sourcesList,
        evidence_sources: t.sourcesCount,
        evidenceSources: t.sourcesCount,
        confidence: isMultiSource ? 'Confirmed gap' : 'Early signal',
        confidence_label: isMultiSource ? `Confirmed gap • ${t.sourcesCount} evidence sources` : 'Early signal • 1 evidence source',
        evidence: t.evidence || [],
        why: `Class accuracy is ${Math.round(t.averagePercentage)}% with ${t.affectedStudentsCount} of ${totalStudents} students affected across ${t.sourcesCount} source(s).`,
        recommended_action: `Review ${t.topic} (${t.skill}) with structured modeling and guided practice before re-assessing.`
      };
    })
    .sort((a, b) => b.priority - a.priority);

  // Merge spelling diagnosis into learning gaps if accuracy is below mastery (<70%)
  if (spellingDiagnosis && spellingDiagnosis.accuracy < 70 && !learningGapPriority.some(g => g.category === 'Spelling' || g.topic === 'Spelling' || g.displayName?.includes('Spelling'))) {
    learningGapPriority.push({
      category: 'Spelling',
      topic: spellingDiagnosis.displayName,
      baseTopic: 'Spelling',
      skill: spellingDiagnosis.skill,
      displayName: spellingDiagnosis.displayName,
      accuracy: spellingDiagnosis.accuracy,
      averageAccuracy: spellingDiagnosis.accuracy,
      average_accuracy: spellingDiagnosis.accuracy,
      studentCount: spellingDiagnosis.studentCount,
      affectedStudentsCount: spellingDiagnosis.studentCount,
      students_affected: spellingDiagnosis.studentCount,
      studentsAffected: spellingDiagnosis.studentCount,
      totalStudents: totalStudents,
      students_total: totalStudents,
      studentsTotal: totalStudents,
      sources: spellingDiagnosis.sources,
      sourcesCount: spellingDiagnosis.sourcesCount,
      sourcesList: spellingDiagnosis.sources,
      evidence_sources: spellingDiagnosis.sourcesCount,
      evidenceSources: spellingDiagnosis.sourcesCount,
      confidence: spellingDiagnosis.confidence,
      confidence_label: `${spellingDiagnosis.confidence} • ${spellingDiagnosis.sourcesCount} evidence source`,
      evidence: [],
      why: spellingDiagnosis.why,
      recommended_action: spellingDiagnosis.recommended_action,
      priority: Number(((spellingDiagnosis.studentCount / (totalStudents || 1)) * (100 - spellingDiagnosis.accuracy)).toFixed(2))
    });
    learningGapPriority.sort((a, b) => b.priority - a.priority);
  }

  const classStrengths = meaningfulTopics.filter(t => t.averagePercentage != null && t.averagePercentage >= 75);
  const studentsNeedingSupport = studentAnalytics.filter(s => s.averagePercentage < 60).map(s => ({
    ...s,
    specificWeakConcepts: s.weakAreas.map(w => w.topic)
  }));
  const recommendedTeachingFocus = learningGapPriority.length > 0 ? {
    topic: learningGapPriority[0].topic,
    baseTopic: learningGapPriority[0].baseTopic,
    skill: learningGapPriority[0].skill,
    category: learningGapPriority[0].category,
    displayName: learningGapPriority[0].displayName,
    accuracy: learningGapPriority[0].averageAccuracy,
    studentsAffected: learningGapPriority[0].studentsAffected,
    studentsTotal: totalStudents,
    sourcesCount: learningGapPriority[0].sourcesCount,
    why: learningGapPriority[0].why,
    recommended_action: learningGapPriority[0].recommended_action,
    rationale: `Top priority gap with ${learningGapPriority[0].sourcesCount || 1} sources of evidence.`
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
    spellingDiagnosis,
    spelling_diagnosis: spellingDiagnosis,
    weakAreaVisualData,
    students: studentAnalytics,
    activityBreakdown,
    topics: meaningfulTopics,
    trends: trendAnalytics,
    dataConfidence,
    calculatedAt: new Date().toISOString(),
    learningGapPriority,
    classStrengths,
    studentsNeedingSupport,
    recommendedTeachingFocus,
    performanceOverTime,
    performance_over_time: performanceOverTime,
    trendData: performanceOverTime
  };
}
