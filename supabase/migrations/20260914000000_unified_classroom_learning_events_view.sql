-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: PHASE 1 — UNIFIED LEARNING EVENTS VIEW (V2)
-- Verified against actual production PostgreSQL schema.
-- Unifies real student learning events across:
-- 1. Tasks / Assignments (public.assignment_submissions)
-- 2. Exam 2.0 Assessments (public.classroom_exam_results)
-- 3. Multiplayer Live Quizzes (public.live_quiz_results)
-- 4. AI OCR Worksheet Evaluations (public.ocr_evaluations)
-- 5. AI Competitions & Challenges (public.ai_challenge_submissions)
-- ============================================================================

-- 1. Performance Indexes on confirmed existing columns
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_sub
  ON public.assignment_submissions(student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_class_student
  ON public.classroom_exam_results(classroom_id, student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_quiz_results_class_student
  ON public.live_quiz_results(classroom_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_class_student
  ON public.ocr_evaluations(class_id, student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_challenge_submissions_student_sub
  ON public.ai_challenge_submissions(student_id, submitted_at DESC);

-- 2. Create the unified PostgreSQL View with security_invoker
CREATE OR REPLACE VIEW public.v_classroom_learning_events
WITH (security_invoker = true) AS

-- ----------------------------------------------------------------------------
-- SOURCE 1: Assignments & Tasks (assignment_submissions)
-- ----------------------------------------------------------------------------
SELECT
    asub.id AS id,
    COALESCE(asub.classroom_id, a.classroom_id) AS classroom_id,
    asub.student_id AS student_id,
    asub.assignment_id AS activity_id,
    'assignment'::text AS activity_type,
    a.title::text AS activity_title,
    COALESCE(a.category, 'assignment')::text AS topic,
    COALESCE(a.category, 'assignment')::text AS category,
    COALESCE(asub.final_score, asub.ai_score, asub.points_awarded)::numeric(6, 2) AS score,
    COALESCE(a.points, 100)::numeric(6, 2) AS max_score,
    COALESCE(
        asub.percentage,
        CASE
            WHEN COALESCE(a.points, 0) > 0 THEN ROUND((COALESCE(asub.final_score, asub.ai_score, asub.points_awarded, 0)::numeric / a.points::numeric) * 100, 2)
            ELSE NULL
        END
    )::numeric(5, 2) AS percentage,
    COALESCE(asub.completed_at, asub.submitted_at) AS completed_at,
    COALESCE(asub.task_version, 1)::integer AS attempt_number,
    'assignment_submissions'::text AS source_table,
    asub.id::text AS source_id,
    jsonb_build_object(
        'is_ai_graded', COALESCE(asub.is_ai_graded, false),
        'teacher_adjusted', COALESCE(asub.teacher_adjusted, false),
        'status', asub.status,
        'has_breakdown', (asub.question_answers IS NOT NULL AND jsonb_array_length(asub.question_answers) > 0)
    ) AS metadata
FROM public.assignment_submissions asub
JOIN public.assignments a ON a.id = asub.assignment_id
WHERE a.is_deleted = false
  AND (asub.status IN ('submitted', 'graded', 'completed') OR asub.completed_at IS NOT NULL OR asub.final_score IS NOT NULL)
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = COALESCE(asub.classroom_id, a.classroom_id)
        AND cm.profile_id = asub.student_id
        AND cm.role = 'student'
  )

UNION ALL

-- ----------------------------------------------------------------------------
-- SOURCE 2: Exam 2.0 Assessments (classroom_exam_results)
-- ----------------------------------------------------------------------------
SELECT
    cer.id AS id,
    COALESCE(cer.classroom_id, e.classroom_id) AS classroom_id,
    cer.student_id AS student_id,
    cer.exam_id AS activity_id,
    'exam'::text AS activity_type,
    e.title::text AS activity_title,
    COALESCE(c.subject, e.title, 'Exam')::text AS topic,
    'exam'::text AS category,
    cer.score::numeric(6, 2) AS score,
    COALESCE(cer.total_marks, cer.max_score, e.total_marks, 100)::numeric(6, 2) AS max_score,
    COALESCE(
        cer.percentage,
        CASE
            WHEN COALESCE(cer.total_marks, cer.max_score, e.total_marks, 0) > 0 
                THEN ROUND((cer.score::numeric / COALESCE(cer.total_marks, cer.max_score, e.total_marks)::numeric) * 100, 2)
            ELSE NULL
        END
    )::numeric(5, 2) AS percentage,
    COALESCE(cer.submitted_at, cer.created_at) AS completed_at,
    COALESCE(cer.attempt_number, 1)::integer AS attempt_number,
    'classroom_exam_results'::text AS source_table,
    cer.id::text AS source_id,
    jsonb_build_object(
        'grade', cer.grade,
        'passed', cer.passed,
        'time_taken_minutes', cer.time_taken_minutes,
        'status', cer.status,
        'has_report_pdf', (cer.report_r2_key IS NOT NULL)
    ) AS metadata
FROM public.classroom_exam_results cer
JOIN public.classroom_exams e ON e.id = cer.exam_id
LEFT JOIN public.classrooms c ON c.id = COALESCE(cer.classroom_id, e.classroom_id)
WHERE (cer.status IN ('submitted', 'reviewed', 'completed', 'graded') OR cer.submitted_at IS NOT NULL)
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = COALESCE(cer.classroom_id, e.classroom_id)
        AND cm.profile_id = cer.student_id
        AND cm.role = 'student'
  )

UNION ALL

-- ----------------------------------------------------------------------------
-- SOURCE 3: Multiplayer Live Quizzes (live_quiz_results)
-- ----------------------------------------------------------------------------
SELECT
    lqr.id AS id,
    lqr.classroom_id AS classroom_id,
    lqr.student_id AS student_id,
    COALESCE(lqr.quiz_id, lqr.session_id) AS activity_id,
    'live_quiz'::text AS activity_type,
    COALESCE(lq.title, 'Live Quiz Session')::text AS activity_title,
    COALESCE(lq.category, 'Live Quiz')::text AS topic,
    'live_quiz'::text AS category,
    lqr.score::numeric(6, 2) AS score,
    (COALESCE(lqr.total_questions, 1) * 1000)::numeric(6, 2) AS max_score,
    COALESCE(lqr.accuracy_percentage, 0)::numeric(5, 2) AS percentage,
    lqr.created_at AS completed_at,
    1::integer AS attempt_number,
    'live_quiz_results'::text AS source_table,
    lqr.id::text AS source_id,
    jsonb_build_object(
        'session_id', lqr.session_id,
        'final_rank', lqr.final_rank,
        'correct_count', lqr.correct_count,
        'wrong_count', lqr.wrong_count,
        'total_questions', lqr.total_questions,
        'points_awarded', lqr.points_awarded
    ) AS metadata
FROM public.live_quiz_results lqr
LEFT JOIN public.live_quizzes lq ON lq.id = lqr.quiz_id
WHERE lqr.classroom_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = lqr.classroom_id
        AND cm.profile_id = lqr.student_id
        AND cm.role = 'student'
  )

UNION ALL

-- ----------------------------------------------------------------------------
-- SOURCE 4: AI OCR Worksheet Evaluations (ocr_evaluations)
-- ----------------------------------------------------------------------------
SELECT
    ocr.id AS id,
    ocr.class_id AS classroom_id,
    ocr.student_id AS student_id,
    ocr.id AS activity_id,
    'ocr'::text AS activity_type,
    COALESCE(NULLIF(ocr.title, ''), ocr.category, 'Worksheet Assessment')::text AS activity_title,
    ocr.category::text AS topic,
    'ocr'::text AS category,
    COALESCE(ocr.final_score, ocr.score)::numeric(6, 2) AS score,
    COALESCE(ocr.max_marks, 100)::numeric(6, 2) AS max_score,
    COALESCE(
        ocr.percentage,
        CASE
            WHEN COALESCE(ocr.max_marks, 0) > 0 
                THEN ROUND((COALESCE(ocr.final_score, ocr.score, 0)::numeric / ocr.max_marks::numeric) * 100, 2)
            ELSE NULL
        END
    )::numeric(5, 2) AS percentage,
    COALESCE(ocr.completed_at, ocr.created_at) AS completed_at,
    1::integer AS attempt_number,
    'ocr_evaluations'::text AS source_table,
    ocr.id::text AS source_id,
    jsonb_build_object(
        'performance', ocr.performance,
        'is_teacher_adjusted', ocr.is_teacher_adjusted,
        'has_report_pdf', (ocr.report_file_key IS NOT NULL)
    ) AS metadata
FROM public.ocr_evaluations ocr
WHERE ocr.status = 'completed'
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = ocr.class_id
        AND cm.profile_id = ocr.student_id
        AND cm.role = 'student'
  )

UNION ALL

-- ----------------------------------------------------------------------------
-- SOURCE 5: AI Competitions & Challenges (ai_challenge_submissions)
-- ----------------------------------------------------------------------------
SELECT
    acs.id AS id,
    ac.classroom_id AS classroom_id,
    acs.student_id AS student_id,
    acs.challenge_id AS activity_id,
    'ai_challenge'::text AS activity_type,
    ac.title::text AS activity_title,
    COALESCE(ac.category, 'Creative Writing')::text AS topic,
    'competition'::text AS category,
    COALESCE(acs.final_score, acs.ai_score)::numeric(6, 2) AS score,
    COALESCE(ac.max_marks, 100)::numeric(6, 2) AS max_score,
    COALESCE(
        acs.percentage,
        CASE
            WHEN COALESCE(ac.max_marks, 0) > 0 
                THEN ROUND((COALESCE(acs.final_score, acs.ai_score, 0)::numeric / ac.max_marks::numeric) * 100, 2)
            ELSE NULL
        END
    )::numeric(5, 2) AS percentage,
    COALESCE(acs.processed_at, acs.submitted_at, acs.created_at) AS completed_at,
    1::integer AS attempt_number,
    'ai_challenge_submissions'::text AS source_table,
    acs.id::text AS source_id,
    jsonb_build_object(
        'submission_type', acs.submission_type,
        'word_count', acs.word_count,
        'teacher_adjusted', acs.teacher_adjusted,
        'status', acs.status
    ) AS metadata
FROM public.ai_challenge_submissions acs
JOIN public.ai_challenges ac ON ac.id = acs.challenge_id
WHERE acs.status IN ('submitted', 'completed', 'teacher_review')
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = ac.classroom_id
        AND cm.profile_id = acs.student_id
        AND cm.role = 'student'
  );

-- 3. Grants (Restricted to authenticated teachers/students and service_role ONLY)
REVOKE ALL ON public.v_classroom_learning_events FROM anon, PUBLIC;
GRANT SELECT ON public.v_classroom_learning_events TO authenticated, service_role;
