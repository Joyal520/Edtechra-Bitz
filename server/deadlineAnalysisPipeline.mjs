// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DEADLINE-BASED BATCH AI ANALYSIS PIPELINE
// Implements the 5-stage classroom diagnostic pipeline:
//   Stage 1: Activity Created with Validated Deadline
//   Stage 2: Student Submissions Collected (NO per-submission classroom AI calls)
//   Stage 3: Automatically Close Expired Activities (`closeExpiredActivities`)
//   Stage 4: Batch Closed Unprocessed Evidence (`checkClassroomAnalysisEligibility` / `processClassroomBatchAnalysis`)
//   Stage 5: Store & Publish Diagnosis with Idempotency, Retry Policy & Cost Control
// ============================================================================

import crypto from 'crypto';

// In-memory lock set to prevent concurrent workers in the same Node process
// from processing the same classroom batch simultaneously.
const activeClassroomLocks = new Set();

/**
 * Computes exponential backoff timestamp for failed AI batch retries.
 * Retry 1 -> +60s, Retry 2 -> +300s (5m), Retry 3 -> +900s (15m)
 */
function computeNextRetryTimestamp(retryCount = 1) {
  const delaySeconds = Math.min(900, Math.pow(3, Math.max(0, retryCount - 1)) * 60);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

/**
 * STAGE 3: Automatically closes open activities whose deadline has passed
 * and transitions them into `closed_pending_analysis`.
 *
 * Works across all 4 classroom evidence sources:
 *   1. Tasks (`assignments.due_date`)
 *   2. Examinations (`classroom_exams.ends_at`)
 *   3. Live Quizzes (`live_quiz_sessions.deadline_at` or `status = 'finished'`)
 *   4. Competitions (`ai_challenges.deadline_at`)
 *
 * @param {Object} serverSupabase
 * @param {string|null} [classroomId] - Optional specific classroom ID; if null, scans all classrooms
 * @returns {Promise<{ closedCount: number, affectedClassroomIds: string[], closedActivities: Array }>}
 */
export async function closeExpiredActivities(serverSupabase, classroomId = null) {
  if (!serverSupabase) {
    return { closedCount: 0, affectedClassroomIds: [], closedActivities: [] };
  }

  const nowIso = new Date().toISOString();
  const closedActivities = [];
  const affectedClassrooms = new Set();

  // 1. Tasks (`assignments`)
  try {
    let q = serverSupabase
      .from('assignments')
      .select('id, classroom_id, title, due_date, status, analysis_status')
      .not('due_date', 'is', null)
      .lte('due_date', nowIso);
    if (classroomId) q = q.eq('classroom_id', classroomId);

    const { data: expiredTasks } = await q;
    for (const task of expiredTasks || []) {
      const aStatus = task.analysis_status || 'open';
      if (aStatus === 'open') {
        const updatePayload = {
          analysis_status: 'closed_pending_analysis',
          closed_at: nowIso
        };
        if (task.status === 'published' || task.status === 'active') {
          updatePayload.status = 'closed';
        }
        const { error: uErr } = await serverSupabase
          .from('assignments')
          .update(updatePayload)
          .eq('id', task.id);

        if (!uErr) {
          closedActivities.push({ id: task.id, type: 'task', title: task.title, classroom_id: task.classroom_id });
          if (task.classroom_id) affectedClassrooms.add(task.classroom_id);
        }
      }
    }
  } catch (err) {
    console.warn('[DeadlinePipeline] Assignments deadline check notice:', err?.message);
  }

  // 2. Examinations (`classroom_exams`)
  try {
    let q = serverSupabase
      .from('classroom_exams')
      .select('id, classroom_id, title, ends_at, status, analysis_status')
      .not('ends_at', 'is', null)
      .lte('ends_at', nowIso);
    if (classroomId) q = q.eq('classroom_id', classroomId);

    const { data: expiredExams } = await q;
    for (const exam of expiredExams || []) {
      const aStatus = exam.analysis_status || 'open';
      if (aStatus === 'open' || exam.status === 'active' || exam.status === 'scheduled') {
        const updatePayload = {
          status: 'closed',
          updated_at: nowIso
        };
        // Attempt with analysis_status columns first, fallback to status-only if migration not applied yet
        const { error: uErr } = await serverSupabase
          .from('classroom_exams')
          .update({
            ...updatePayload,
            analysis_status: 'closed_pending_analysis',
            closed_at: nowIso
          })
          .eq('id', exam.id);

        if (uErr) {
          await serverSupabase.from('classroom_exams').update(updatePayload).eq('id', exam.id);
        }
        closedActivities.push({ id: exam.id, type: 'exam', title: exam.title, classroom_id: exam.classroom_id });
        if (exam.classroom_id) affectedClassrooms.add(exam.classroom_id);
      }
    }
  } catch (err) {
    console.warn('[DeadlinePipeline] Classroom exams deadline check notice:', err?.message);
  }

  // 3. Live Quizzes (`live_quiz_sessions`)
  try {
    let q = serverSupabase
      .from('live_quiz_sessions')
      .select('id, classroom_id, title, status, ended_at, deadline_at, analysis_status');
    if (classroomId) q = q.eq('classroom_id', classroomId);

    const { data: quizSessions } = await q;
    for (const quiz of quizSessions || []) {
      const aStatus = quiz.analysis_status || 'open';
      const deadlinePassed = quiz.deadline_at && new Date(quiz.deadline_at).getTime() <= Date.now();
      const isFinished = quiz.status === 'finished' || quiz.status === 'completed' || quiz.status === 'ended';

      if (aStatus === 'open' && (deadlinePassed || isFinished)) {
        const { error: uErr } = await serverSupabase
          .from('live_quiz_sessions')
          .update({
            status: 'finished',
            ended_at: quiz.ended_at || nowIso,
            closed_at: nowIso,
            analysis_status: 'closed_pending_analysis'
          })
          .eq('id', quiz.id);

        if (!uErr) {
          closedActivities.push({ id: quiz.id, type: 'live_quiz', title: quiz.title, classroom_id: quiz.classroom_id });
          if (quiz.classroom_id) affectedClassrooms.add(quiz.classroom_id);
        }
      }
    }
  } catch (err) {
    console.warn('[DeadlinePipeline] Live quiz deadline check notice:', err?.message);
  }

  // 4. Competitions / AI Challenges (`ai_challenges`)
  try {
    let q = serverSupabase
      .from('ai_challenges')
      .select('id, classroom_id, title, deadline_at, status, analysis_status')
      .not('deadline_at', 'is', null)
      .lte('deadline_at', nowIso);
    if (classroomId) q = q.eq('classroom_id', classroomId);

    const { data: expiredChallenges } = await q;
    for (const ch of expiredChallenges || []) {
      const aStatus = ch.analysis_status || 'open';
      if (aStatus === 'open' || ch.status === 'active') {
        const { error: uErr } = await serverSupabase
          .from('ai_challenges')
          .update({
            status: 'ended',
            analysis_status: 'closed_pending_analysis',
            closed_at: nowIso
          })
          .eq('id', ch.id);

        if (uErr) {
          await serverSupabase.from('ai_challenges').update({ status: 'ended' }).eq('id', ch.id);
        }
        closedActivities.push({ id: ch.id, type: 'competition', title: ch.title, classroom_id: ch.classroom_id });
        if (ch.classroom_id) affectedClassrooms.add(ch.classroom_id);
      }
    }
  } catch (err) {
    console.warn('[DeadlinePipeline] AI challenges deadline check notice:', err?.message);
  }

  return {
    closedCount: closedActivities.length,
    affectedClassroomIds: Array.from(affectedClassrooms),
    closedActivities
  };
}

/**
 * Inspects a classroom's closed/completed activities, student submissions, and saved
 * `ai_classroom_insights` + `ai_analysis_batches` records to determine whether
 * new closed unprocessed evidence exists or a failed batch is awaiting retry.
 *
 * Strictly enforces:
 *   - Open activities whose deadlines have NOT passed do NOT trigger batch AI calls.
 *   - Closed activities (or legacy completed activities with submissions) are grouped
 *     into a deterministic `batch_key`.
 *   - If `batch_key` matches the latest completed diagnosis in `ai_classroom_insights`,
 *     `hasNewClosedEvidence` is `false` (no duplicate AI call).
 */
export async function inspectClassroomBatchState(serverSupabase, classroomId, metricsSummary = null) {
  if (!serverSupabase || !classroomId) {
    return {
      processingStatus: 'completed',
      hasNewClosedEvidence: false,
      hasFailedBatchToRetry: false,
      openActivitiesCount: 0,
      pendingClosedActivities: [],
      eligibleActivityIds: [],
      eligibleEvidenceIds: [],
      batchKey: 'empty_batch',
      latestSavedInsight: null,
      latestBatchRecord: null
    };
  }

  const nowMs = Date.now();
  const openActivities = [];
  const closedActivities = [];
  const pendingClosedActivities = [];

  // 1. Inspect Tasks (`assignments`)
  try {
    const { data: tasks } = await serverSupabase
      .from('assignments')
      .select('id, title, due_date, status, analysis_status, closed_at, analyzed_at')
      .eq('classroom_id', classroomId);

    for (const t of tasks || []) {
      const dueMs = t.due_date ? new Date(t.due_date).getTime() : null;
      const isClosedByDeadline = dueMs != null && dueMs <= nowMs;
      const isExplicitlyClosed =
        t.status === 'closed' ||
        t.analysis_status === 'closed_pending_analysis' ||
        t.analysis_status === 'completed';

      if (dueMs != null && dueMs > nowMs && t.status !== 'closed') {
        openActivities.push({ id: t.id, type: 'task', title: t.title, deadlineAt: t.due_date });
      } else if (isClosedByDeadline || isExplicitlyClosed || !t.due_date) {
        closedActivities.push({ id: t.id, type: 'task', title: t.title, deadlineAt: t.due_date, analysisStatus: t.analysis_status });
        if (t.analysis_status === 'closed_pending_analysis' || (isClosedByDeadline && t.analysis_status !== 'completed')) {
          pendingClosedActivities.push({ id: t.id, type: 'task', title: t.title });
        }
      }
    }
  } catch (_) {}

  // 2. Inspect Examinations (`classroom_exams`)
  try {
    const { data: exams } = await serverSupabase
      .from('classroom_exams')
      .select('id, title, ends_at, status, analysis_status')
      .eq('classroom_id', classroomId);

    for (const ex of exams || []) {
      const endMs = ex.ends_at ? new Date(ex.ends_at).getTime() : null;
      const isClosedByDeadline = endMs != null && endMs <= nowMs;
      const isExplicitlyClosed =
        ex.status === 'closed' ||
        ex.analysis_status === 'closed_pending_analysis' ||
        ex.analysis_status === 'completed';

      if (endMs != null && endMs > nowMs && ex.status !== 'closed') {
        openActivities.push({ id: ex.id, type: 'exam', title: ex.title, deadlineAt: ex.ends_at });
      } else if (isClosedByDeadline || isExplicitlyClosed || !ex.ends_at) {
        closedActivities.push({ id: ex.id, type: 'exam', title: ex.title, deadlineAt: ex.ends_at, analysisStatus: ex.analysis_status });
        if (ex.analysis_status === 'closed_pending_analysis' || (isClosedByDeadline && ex.analysis_status !== 'completed')) {
          pendingClosedActivities.push({ id: ex.id, type: 'exam', title: ex.title });
        }
      }
    }
  } catch (_) {}

  // 3. Inspect Live Quizzes (`live_quiz_sessions`)
  try {
    const { data: quizzes } = await serverSupabase
      .from('live_quiz_sessions')
      .select('id, title, status, ended_at, deadline_at, analysis_status')
      .eq('classroom_id', classroomId);

    for (const q of quizzes || []) {
      const endMs = q.deadline_at ? new Date(q.deadline_at).getTime() : null;
      const isFinished = q.status === 'finished' || q.status === 'completed' || q.status === 'ended' || (endMs != null && endMs <= nowMs);
      if (!isFinished) {
        openActivities.push({ id: q.id, type: 'live_quiz', title: q.title, deadlineAt: q.deadline_at });
      } else {
        closedActivities.push({ id: q.id, type: 'live_quiz', title: q.title, deadlineAt: q.deadline_at || q.ended_at, analysisStatus: q.analysis_status });
        if (q.analysis_status === 'closed_pending_analysis' || q.analysis_status !== 'completed') {
          pendingClosedActivities.push({ id: q.id, type: 'live_quiz', title: q.title });
        }
      }
    }
  } catch (_) {}

  // 4. Inspect Competitions (`ai_challenges`)
  try {
    const { data: challenges } = await serverSupabase
      .from('ai_challenges')
      .select('id, title, deadline_at, status, analysis_status')
      .eq('classroom_id', classroomId);

    for (const ch of challenges || []) {
      const endMs = ch.deadline_at ? new Date(ch.deadline_at).getTime() : null;
      const isClosed = ch.status === 'ended' || ch.status === 'closed' || (endMs != null && endMs <= nowMs);
      if (endMs != null && endMs > nowMs && ch.status === 'active') {
        openActivities.push({ id: ch.id, type: 'competition', title: ch.title, deadlineAt: ch.deadline_at });
      } else if (isClosed || !ch.deadline_at) {
        closedActivities.push({ id: ch.id, type: 'competition', title: ch.title, deadlineAt: ch.deadline_at, analysisStatus: ch.analysis_status });
        if (ch.analysis_status === 'closed_pending_analysis' || (isClosed && ch.analysis_status !== 'completed')) {
          pendingClosedActivities.push({ id: ch.id, type: 'competition', title: ch.title });
        }
      }
    }
  } catch (_) {}

  // Filter evidence events to exclude still-open activities (activities with a future deadline)
  const openActivityIdSet = new Set(openActivities.map(a => String(a.id)));
  const allEvidence = metricsSummary?.all_evidence || metricsSummary?.recent_learning_evidence || [];
  const eligibleEvidence = allEvidence.filter(ev => {
    const actId = String(ev.activityId || ev.activity_id || '');
    return !openActivityIdSet.has(actId);
  });

  const eligibleEvidenceIds = eligibleEvidence
    .map(ev => String(ev.id || ''))
    .filter(Boolean)
    .sort();

  const closedActivityIdsFromEvidence = Array.from(
    new Set([
      ...closedActivities.map(a => `${a.type}:${a.id}`),
      ...eligibleEvidence.map(ev => `${ev.activityType || ev.activity_type || 'task'}:${ev.activityId || ev.activity_id || ev.id}`)
    ])
  ).sort();

  const batchSignaturePayload = JSON.stringify({
    classroomId,
    closedActivities: closedActivityIdsFromEvidence,
    eligibleEvidenceIds
  });

  const batchKey =
    eligibleEvidenceIds.length > 0 || closedActivities.length > 0
      ? `batch_${crypto.createHash('sha256').update(batchSignaturePayload).digest('hex').slice(0, 20)}`
      : 'empty_batch';

  // Fetch latest saved insight and latest batch record
  let latestSavedInsight = null;
  let latestBatchRecord = null;

  try {
    const { data: saved } = await serverSupabase
      .from('ai_classroom_insights')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (saved) latestSavedInsight = saved;
  } catch (_) {}

  try {
    const { data: batchRow } = await serverSupabase
      .from('ai_analysis_batches')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (batchRow) latestBatchRecord = batchRow;
  } catch (_) {}

  const hasFailedBatchToRetry =
    latestBatchRecord?.status === 'failed' &&
    (latestBatchRecord.retry_count || 0) < (latestBatchRecord.max_retries || 3);

  // Determine whether new closed evidence exists compared to the latest saved insight
  const savedBatchKey = latestSavedInsight?.batch_key || latestSavedInsight?.intelligence_json?.batch_metadata?.batch_key;
  const savedDataHash = latestSavedInsight?.data_hash;

  let hasNewClosedEvidence = false;
  if (eligibleEvidence.length > 0) {
    if (!latestSavedInsight || !latestSavedInsight.intelligence_json) {
      hasNewClosedEvidence = true;
    } else if (savedBatchKey) {
      hasNewClosedEvidence = savedBatchKey !== batchKey;
    } else if (pendingClosedActivities.length > 0) {
      hasNewClosedEvidence = true;
    } else if (savedDataHash && metricsSummary?.data_hash && openActivities.length === 0) {
      hasNewClosedEvidence = savedDataHash !== metricsSummary.data_hash;
    }
  }

  let processingStatus = 'completed';
  if (activeClassroomLocks.has(classroomId) || latestBatchRecord?.status === 'processing') {
    processingStatus = 'processing';
  } else if (hasFailedBatchToRetry) {
    processingStatus = 'failed';
  } else if (hasNewClosedEvidence) {
    processingStatus = 'closed_pending_analysis';
  } else if (openActivities.length > 0 && eligibleEvidence.length === 0) {
    processingStatus = 'open';
  }

  return {
    processingStatus,
    hasNewClosedEvidence,
    hasFailedBatchToRetry,
    openActivitiesCount: openActivities.length,
    openActivities,
    closedActivitiesCount: closedActivities.length,
    pendingClosedActivities,
    eligibleActivityIds: closedActivityIdsFromEvidence,
    eligibleEvidenceIds,
    eligibleEvidenceCount: eligibleEvidence.length,
    batchKey,
    latestSavedInsight,
    latestBatchRecord
  };
}

/**
 * STAGE 4 & 5: Executes a single deduplicated batch AI analysis for a classroom's
 * closed activities, stores the diagnosis in `ai_classroom_insights` and `ai_analysis_batches`,
 * and marks contributing closed activities as `completed`.
 */
export async function executeBatchClassroomAnalysis({
  serverSupabase,
  classroomId,
  teacherId,
  metricsSummary,
  batchState,
  generateTeachingIntelligenceFn,
  synthesizeDeterministicIntelligenceFn,
  serverOpenAI,
  triggerReason = 'deadline_reached',
  forceReanalysis = false
}) {
  if (!serverSupabase || !classroomId) {
    throw new Error('serverSupabase and classroomId are required for batch analysis.');
  }

  // Prevent concurrent duplicate runs for the same classroom
  if (activeClassroomLocks.has(classroomId)) {
    return {
      alreadyProcessing: true,
      processingStatus: 'processing',
      aiCalled: false
    };
  }

  activeClassroomLocks.add(classroomId);
  const startedAt = new Date().toISOString();
  const batchKey = forceReanalysis
    ? `${batchState.batchKey}_forced_${Date.now()}`
    : batchState.batchKey;

  let batchRecordId = batchState.latestBatchRecord?.batch_key === batchKey ? batchState.latestBatchRecord.id : null;

  try {
    // 1. Upsert batch queue record in `ai_analysis_batches` as `processing`
    try {
      const { data: upsertedBatch } = await serverSupabase
        .from('ai_analysis_batches')
        .upsert(
          {
            classroom_id: classroomId,
            batch_key: batchKey,
            status: 'processing',
            trigger_reason: triggerReason,
            activity_ids: batchState.eligibleActivityIds || [],
            evidence_ids: batchState.eligibleEvidenceIds || [],
            evidence_summary_json: {
              total_students: metricsSummary.class_summary?.total_students || 0,
              eligible_evidence_count: batchState.eligibleEvidenceCount || 0,
              closed_activities_count: batchState.closedActivitiesCount || 0,
              open_activities_count: batchState.openActivitiesCount || 0,
              diagnoses_count: (metricsSummary.diagnoses || []).length
            },
            started_at: startedAt,
            updated_at: startedAt
          },
          { onConflict: 'classroom_id,batch_key' }
        )
        .select('id')
        .maybeSingle();

      if (upsertedBatch?.id) {
        batchRecordId = upsertedBatch.id;
      }
    } catch (bErr) {
      console.warn('[DeadlinePipeline] Batch table upsert notice:', bErr?.message);
    }

    // 2. Call the AI model once for the aggregated classroom batch
    let intelligence = null;
    let aiCalled = false;

    try {
      aiCalled = true;
      intelligence = await generateTeachingIntelligenceFn({
        metricsSummary,
        serverOpenAI
      });
    } catch (aiErr) {
      console.error('[DeadlinePipeline] Batch AI call failed:', aiErr?.message);
      // Record failure in `ai_analysis_batches` with controlled retry backoff
      const prevRetries = batchState.latestBatchRecord?.retry_count || 0;
      const nextRetryCount = prevRetries + 1;
      try {
        if (batchRecordId) {
          await serverSupabase
            .from('ai_analysis_batches')
            .update({
              status: 'failed',
              retry_count: nextRetryCount,
              next_retry_at: computeNextRetryTimestamp(nextRetryCount),
              error_message: aiErr?.message || 'AI analysis error',
              updated_at: new Date().toISOString()
            })
            .eq('id', batchRecordId);
        }
      } catch (_) {}

      // If we already have a previous saved diagnosis, preserve it instead of discarding!
      if (batchState.latestSavedInsight?.intelligence_json) {
        return {
          success: false,
          aiCalled: true,
          processingStatus: 'failed',
          error: aiErr?.message || 'AI request failed; preserved existing diagnosis.',
          intelligence: batchState.latestSavedInsight.intelligence_json,
          ai_provider: batchState.latestSavedInsight.ai_provider || 'cached',
          updated_at: batchState.latestSavedInsight.updated_at
        };
      }

      // Otherwise synthesize deterministic diagnosis so teacher is never left with a broken screen
      intelligence = {
        ...synthesizeDeterministicIntelligenceFn(metricsSummary),
        ai_provider: 'deterministic_fallback',
        model: 'local-analytics-engine'
      };
    }

    const completedAt = new Date().toISOString();
    const prevVersion = batchState.latestSavedInsight?.diagnosis_version || 0;
    const nextVersion = prevVersion + 1;

    // Attach batch metadata directly inside intelligence_json so it persists even if optional columns aren't migrated
    const enrichedIntelligence = {
      ...intelligence,
      batch_metadata: {
        batch_id: batchRecordId,
        batch_key: batchKey,
        trigger_reason: triggerReason,
        processing_status: 'completed',
        diagnosis_version: nextVersion,
        source_activity_ids: batchState.eligibleActivityIds || [],
        source_evidence_ids: batchState.eligibleEvidenceIds || [],
        analyzed_at: completedAt
      }
    };

    // 3. Persist diagnosis in `ai_classroom_insights` (preserving version history)
    const resolvedTeacherId =
      teacherId ||
      metricsSummary?.classroom?.teacherId ||
      batchState.latestSavedInsight?.teacher_id;

    if (resolvedTeacherId) {
      const previousVersions = Array.isArray(batchState.latestSavedInsight?.previous_versions_json)
        ? [...batchState.latestSavedInsight.previous_versions_json]
        : [];
      if (batchState.latestSavedInsight?.intelligence_json) {
        previousVersions.unshift({
          version: prevVersion || 1,
          batch_key: batchState.latestSavedInsight.batch_key || null,
          updated_at: batchState.latestSavedInsight.updated_at || batchState.latestSavedInsight.created_at,
          ai_provider: batchState.latestSavedInsight.ai_provider,
          summary: batchState.latestSavedInsight.intelligence_json.summary
        });
      }

      const fullInsertPayload = {
        classroom_id: classroomId,
        teacher_id: resolvedTeacherId,
        data_hash: metricsSummary.data_hash,
        metrics_summary: metricsSummary,
        intelligence_json: enrichedIntelligence,
        ai_provider:
          intelligence.ai_provider === 'openai' || intelligence.ai_provider === 'gemini'
            ? intelligence.ai_provider
            : 'gemini',
        batch_id: batchRecordId,
        batch_key: batchKey,
        processing_status: 'completed',
        source_activity_ids: batchState.eligibleActivityIds || [],
        source_evidence_ids: batchState.eligibleEvidenceIds || [],
        diagnosis_version: nextVersion,
        previous_versions_json: previousVersions.slice(0, 10),
        ai_model: intelligence.model || 'ai-diagnostic-engine',
        updated_at: completedAt
      };

      const { error: fullInsertErr } = await serverSupabase
        .from('ai_classroom_insights')
        .insert(fullInsertPayload);

      if (fullInsertErr) {
        // Fallback insert if new migration columns are not yet present in target DB
        await serverSupabase.from('ai_classroom_insights').insert({
          classroom_id: classroomId,
          teacher_id: resolvedTeacherId,
          data_hash: metricsSummary.data_hash,
          metrics_summary: metricsSummary,
          intelligence_json: enrichedIntelligence,
          ai_provider:
            intelligence.ai_provider === 'openai' || intelligence.ai_provider === 'gemini'
              ? intelligence.ai_provider
              : 'gemini',
          updated_at: completedAt
        });
      }
    }

    // 4. Mark `ai_analysis_batches` row as `completed`
    if (batchRecordId) {
      try {
        await serverSupabase
          .from('ai_analysis_batches')
          .update({
            status: 'completed',
            diagnosis_output_json: enrichedIntelligence,
            ai_provider: intelligence.ai_provider || 'gemini',
            ai_model: intelligence.model || 'ai-diagnostic-engine',
            completed_at: completedAt,
            error_message: null,
            updated_at: completedAt
          })
          .eq('id', batchRecordId);
      } catch (_) {}
    }

    // 5. Mark closed pending activities in this classroom as `completed`
    const markCompletedPayload = {
      analysis_status: 'completed',
      analyzed_at: completedAt,
      ...(batchRecordId ? { analysis_batch_id: batchRecordId } : {})
    };

    await Promise.allSettled([
      serverSupabase
        .from('assignments')
        .update(markCompletedPayload)
        .eq('classroom_id', classroomId)
        .eq('analysis_status', 'closed_pending_analysis'),
      serverSupabase
        .from('classroom_exams')
        .update(markCompletedPayload)
        .eq('classroom_id', classroomId)
        .eq('analysis_status', 'closed_pending_analysis'),
      serverSupabase
        .from('live_quiz_sessions')
        .update(markCompletedPayload)
        .eq('classroom_id', classroomId)
        .eq('analysis_status', 'closed_pending_analysis'),
      serverSupabase
        .from('ai_challenges')
        .update(markCompletedPayload)
        .eq('classroom_id', classroomId)
        .eq('analysis_status', 'closed_pending_analysis'),
      serverSupabase
        .from('ocr_evaluations')
        .update(markCompletedPayload)
        .eq('class_id', classroomId)
        .eq('analysis_status', 'closed_pending_analysis')
    ]);

    return {
      success: true,
      aiCalled,
      processingStatus: 'completed',
      batchKey,
      batchId: batchRecordId,
      diagnosisVersion: nextVersion,
      intelligence: enrichedIntelligence,
      ai_provider: intelligence.ai_provider || 'gemini',
      updated_at: completedAt
    };
  } finally {
    activeClassroomLocks.delete(classroomId);
  }
}

/**
 * Background worker entrypoint called periodically by the server scheduler.
 * 1. Closes any open activities across all classrooms whose deadlines have passed.
 * 2. Finds classrooms with newly closed activities or retryable failed batches.
 * 3. Processes their evidence in a single batch per classroom.
 */
export async function runDeadlineBatchWorker({
  serverSupabase,
  computeClassroomMetricsFn,
  generateTeachingIntelligenceFn,
  synthesizeDeterministicIntelligenceFn,
  serverOpenAI
}) {
  if (!serverSupabase) return { closedCount: 0, processedClassrooms: [] };

  const closeResult = await closeExpiredActivities(serverSupabase, null);
  const candidateClassroomIds = new Set(closeResult.affectedClassroomIds || []);

  // Also check for any retryable failed batches whose `next_retry_at` has arrived
  try {
    const nowIso = new Date().toISOString();
    const { data: failedBatches } = await serverSupabase
      .from('ai_analysis_batches')
      .select('classroom_id, retry_count, max_retries, next_retry_at')
      .eq('status', 'failed')
      .lte('next_retry_at', nowIso)
      .limit(10);

    for (const fb of failedBatches || []) {
      if ((fb.retry_count || 0) < (fb.max_retries || 3) && fb.classroom_id) {
        candidateClassroomIds.add(fb.classroom_id);
      }
    }
  } catch (_) {}

  const processedClassrooms = [];

  for (const cid of candidateClassroomIds) {
    try {
      const metricsSummary = await computeClassroomMetricsFn(serverSupabase, cid);
      const batchState = await inspectClassroomBatchState(serverSupabase, cid, metricsSummary);

      if (batchState.hasNewClosedEvidence || batchState.hasFailedBatchToRetry) {
        const { data: cls } = await serverSupabase
          .from('classrooms')
          .select('teacher_id')
          .eq('id', cid)
          .maybeSingle();

        const res = await executeBatchClassroomAnalysis({
          serverSupabase,
          classroomId: cid,
          teacherId: cls?.teacher_id,
          metricsSummary,
          batchState,
          generateTeachingIntelligenceFn,
          synthesizeDeterministicIntelligenceFn,
          serverOpenAI,
          triggerReason: batchState.hasFailedBatchToRetry ? 'scheduled_retry' : 'deadline_reached'
        });

        processedClassrooms.push({ classroomId: cid, status: res.processingStatus, aiCalled: res.aiCalled });
      }
    } catch (err) {
      console.warn(`[DeadlinePipeline] Worker batch processing warning for classroom ${cid}:`, err?.message);
    }
  }

  return {
    closedCount: closeResult.closedCount,
    processedClassrooms
  };
}
