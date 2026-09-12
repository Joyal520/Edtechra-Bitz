-- ============================================================================
-- EDTECHRA-BITZ: AI Challenge Content Analysis & Penalty Policy Schema Update
-- ============================================================================

-- 1. Add AI detection and penalty columns to public.ai_challenge_submissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_challenge_submissions' 
          AND column_name = 'ai_detection_score'
    ) THEN
        ALTER TABLE public.ai_challenge_submissions 
        ADD COLUMN ai_detection_score NUMERIC(5,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_challenge_submissions' 
          AND column_name = 'ai_risk_level'
    ) THEN
        ALTER TABLE public.ai_challenge_submissions 
        ADD COLUMN ai_risk_level TEXT DEFAULT 'Minimal';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_challenge_submissions' 
          AND column_name = 'ai_penalty'
    ) THEN
        ALTER TABLE public.ai_challenge_submissions 
        ADD COLUMN ai_penalty NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Performance Index for Leaderboard (final_score DESC, submitted_at ASC)
CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_leaderboard 
ON public.ai_challenge_submissions(challenge_id, final_score DESC NULLS LAST, submitted_at ASC);

-- 3. Update Unified Classroom Learning Events View to include AI content metrics
CREATE OR REPLACE VIEW public.v_classroom_learning_events AS

-- SOURCE 1: Direct Task Submissions (classroom_task_submissions)
SELECT
    ts.id AS id,
    t.classroom_id AS classroom_id,
    ts.student_id AS student_id,
    ts.task_id AS activity_id,
    'task'::text AS activity_type,
    t.title::text AS activity_title,
    COALESCE(t.topic, t.title, 'General Task')::text AS topic,
    'task'::text AS category,
    ts.score::numeric(6, 2) AS score,
    COALESCE(t.max_score, 100)::numeric(6, 2) AS max_score,
    COALESCE(
        ts.percentage,
        CASE 
            WHEN COALESCE(t.max_score, 0) > 0 
                THEN ROUND((ts.score::numeric / t.max_score::numeric) * 100, 2)
            ELSE NULL 
        END
    )::numeric(5, 2) AS percentage,
    COALESCE(ts.reviewed_at, ts.submitted_at, ts.created_at) AS completed_at,
    1::integer AS attempt_number,
    'classroom_task_submissions'::text AS source_table,
    ts.id::text AS source_id,
    jsonb_build_object(
        'status', ts.status,
        'has_content', (ts.content IS NOT NULL AND ts.content <> ''),
        'attachment_count', jsonb_array_length(COALESCE(ts.attachments, '[]'::jsonb))
    ) AS metadata
FROM public.classroom_task_submissions ts
JOIN public.classroom_tasks t ON t.id = ts.task_id
WHERE (ts.status IN ('submitted', 'reviewed') OR ts.submitted_at IS NOT NULL)
  AND EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = t.classroom_id
        AND cm.profile_id = ts.student_id
        AND cm.role = 'student'
  )

UNION ALL

-- SOURCE 2: Formal Examinations (classroom_exam_results)
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

-- SOURCE 3: Multiplayer Live Quizzes (live_quiz_results)
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
        'rank', lqr.rank,
        'accuracy_percentage', lqr.accuracy_percentage,
        'correct_answers', lqr.correct_answers,
        'total_questions', lqr.total_questions,
        'streak_max', lqr.streak_max
    ) AS metadata
FROM public.live_quiz_results lqr
LEFT JOIN public.live_quizzes lq ON lq.id = lqr.quiz_id
WHERE EXISTS (
    SELECT 1 FROM public.classroom_members cm
    WHERE cm.classroom_id = lqr.classroom_id
      AND cm.profile_id = lqr.student_id
      AND cm.role = 'student'
)

UNION ALL

-- SOURCE 4: AI Worksheet / Physical Document Assessments (ocr_evaluations)
SELECT
    ocr.id AS id,
    ocr.class_id AS classroom_id,
    ocr.student_id AS student_id,
    COALESCE(ocr.task_id, ocr.id) AS activity_id,
    'ocr_assessment'::text AS activity_type,
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

-- SOURCE 5: AI Competitions & Challenges (ai_challenge_submissions)
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
        'ai_original_score', acs.ai_original_score,
        'ai_penalty', acs.ai_penalty,
        'ai_detection_score', acs.ai_detection_score,
        'ai_risk_level', acs.ai_risk_level,
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

-- Permissions
REVOKE ALL ON public.v_classroom_learning_events FROM anon, PUBLIC;
GRANT SELECT ON public.v_classroom_learning_events TO authenticated, service_role;
