-- OPTIONAL one-off repair: regrade historical answers whose is_correct disagrees
-- with the canonical key (selected_option_index == correct_index). Run AFTER
-- 20261012000000_live_quiz_authoritative_engine.sql. Review before running:
-- it changes stored points of affected rows to the 100-point rule and
-- recomputes participants.score for affected sessions only.
WITH fix AS (
    SELECT a.id, a.session_id, a.student_id,
           (a.selected_option_index = q.correct_index) AS should_be_correct,
           ROUND(100.0 / NULLIF((SELECT count(*) FROM public.live_quiz_questions qq WHERE qq.quiz_id = s.quiz_id), 0))::INTEGER AS pts
    FROM public.live_quiz_answers a
    JOIN public.live_quiz_sessions s ON s.id = a.session_id
    JOIN public.live_quiz_questions q ON q.quiz_id = s.quiz_id AND q.question_index = a.question_index
    WHERE a.is_correct IS DISTINCT FROM (a.selected_option_index = q.correct_index)
),
upd AS (
    UPDATE public.live_quiz_answers a
    SET is_correct = f.should_be_correct,
        points_awarded = CASE WHEN f.should_be_correct THEN COALESCE(f.pts, 0) ELSE 0 END
    FROM fix f
    WHERE a.id = f.id
    RETURNING a.session_id
)
UPDATE public.live_quiz_participants p
SET score = COALESCE((SELECT sum(points_awarded) FROM public.live_quiz_answers a
                      WHERE a.session_id = p.session_id AND a.student_id = p.student_id), 0)
WHERE p.session_id IN (SELECT DISTINCT session_id FROM upd);
