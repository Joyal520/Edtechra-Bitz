-- ============================================================================
-- EDTECHRA-BITZ: Knowledge Bitz V2 — Categories, Multi-Quiz, Subtopics
-- Migration: 20260831160000_knowledge_bitz_v2_categories.sql
--
-- Changes:
-- 1. Add quiz_answers JSONB to bitz_learning_history (per-question tracking)
-- 2. Add image_source column to knowledge_bitz
-- 3. Replace record_bitz_learning_state RPC with V2 multi-question support
-- 4. Add index on knowledge_bitz(sub_topic)
--
-- BACKWARD COMPATIBILITY:
-- - Existing learning history, bookmarks, likes, XP are preserved.
-- - Learning states remain: seen, opened, read, learned (unchanged).
-- - quiz column remains JSONB (supports both single object and array).
-- - category column remains TEXT (application maps old/new values).
-- ============================================================================

-- 1. Add quiz_answers JSONB column to track per-question answers
-- Stores: {"0": true, "1": false, "2": true, ...} keyed by question index
ALTER TABLE public.bitz_learning_history
  ADD COLUMN IF NOT EXISTS quiz_answers JSONB DEFAULT NULL;

-- 2. Add image_source column to knowledge_bitz
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'none';

-- 3. Add index for subtopic filtering in admin
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_sub_topic
  ON public.knowledge_bitz(sub_topic)
  WHERE sub_topic IS NOT NULL;

-- 4. Replace the learning state RPC with V2 multi-question quiz support
-- Supports both:
--   (a) Legacy single-quiz: p_selected_quiz_option with no question index
--   (b) V2 multi-quiz: p_question_index + p_selected_quiz_option
CREATE OR REPLACE FUNCTION public.record_bitz_learning_state(
  p_bitz_id UUID,
  p_new_status TEXT,                    -- 'seen', 'opened', 'read', 'learned'
  p_selected_quiz_option TEXT DEFAULT NULL,
  p_question_index INTEGER DEFAULT NULL  -- V2: which question (0-4)
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_bitz public.knowledge_bitz%ROWTYPE;
  v_current_history public.bitz_learning_history%ROWTYPE;
  v_xp_to_award INTEGER := 0;
  v_is_correct BOOLEAN := NULL;
  v_quiz_attempted BOOLEAN := FALSE;
  v_already_learned BOOLEAN := FALSE;
  v_correct_answer TEXT;
  v_quiz_answers JSONB;
  v_total_answered INTEGER := 0;
  v_quiz_is_array BOOLEAN := FALSE;
  v_quiz_element JSONB;
BEGIN
  -- Strict authenticated user check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: User authentication required');
  END IF;

  SELECT * INTO v_bitz FROM public.knowledge_bitz WHERE id = p_bitz_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Knowledge Bitz not found');
  END IF;

  SELECT * INTO v_current_history 
  FROM public.bitz_learning_history 
  WHERE user_id = v_user_id AND bitz_id = p_bitz_id;

  IF FOUND THEN
    v_already_learned := (v_current_history.status = 'learned');
    v_quiz_answers := COALESCE(v_current_history.quiz_answers, '{}'::jsonb);
  ELSE
    v_quiz_answers := '{}'::jsonb;
  END IF;

  -- Determine if quiz is an array or single object
  v_quiz_is_array := (v_bitz.quiz IS NOT NULL AND jsonb_typeof(v_bitz.quiz) = 'array');

  -- Quiz validation
  IF p_selected_quiz_option IS NOT NULL AND v_bitz.quiz IS NOT NULL THEN
    v_quiz_attempted := TRUE;

    IF v_quiz_is_array AND p_question_index IS NOT NULL THEN
      -- V2 MULTI-QUIZ: validate specific question by index
      IF p_question_index < 0 OR p_question_index >= jsonb_array_length(v_bitz.quiz) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid question index');
      END IF;

      -- Prevent re-answering same question (anti-farming)
      IF v_quiz_answers ? p_question_index::text THEN
        RETURN jsonb_build_object(
          'success', true,
          'status', COALESCE(v_current_history.status, p_new_status),
          'isCorrect', (v_quiz_answers->>p_question_index::text)::boolean,
          'xpAwarded', 0,
          'alreadyAnswered', true,
          'questionIndex', p_question_index,
          'totalQuestionsAnswered', (SELECT count(*) FROM jsonb_object_keys(v_quiz_answers))::integer
        );
      END IF;

      v_quiz_element := v_bitz.quiz->p_question_index;
      v_correct_answer := TRIM(COALESCE(v_quiz_element->>'correct_answer', v_quiz_element->>'correctAnswer', ''));

      IF LOWER(TRIM(p_selected_quiz_option)) = LOWER(v_correct_answer) THEN
        v_is_correct := TRUE;
        IF NOT v_already_learned THEN
          v_xp_to_award := 2;  -- 2 XP per correct answer
        END IF;
      ELSE
        v_is_correct := FALSE;
      END IF;

      -- Record this question's answer
      v_quiz_answers := v_quiz_answers || jsonb_build_object(p_question_index::text, v_is_correct);

      -- Count total questions answered
      v_total_answered := (SELECT count(*) FROM jsonb_object_keys(v_quiz_answers))::integer;

      -- If all questions answered, mark as learned
      IF v_total_answered >= jsonb_array_length(v_bitz.quiz) AND NOT v_already_learned THEN
        p_new_status := 'learned';
      END IF;

    ELSE
      -- LEGACY SINGLE-QUIZ: validate single quiz object
      v_correct_answer := TRIM(COALESCE(v_bitz.quiz->>'correct_answer', v_bitz.quiz->>'correctAnswer', ''));
      IF LOWER(TRIM(p_selected_quiz_option)) = LOWER(v_correct_answer) THEN
        v_is_correct := TRUE;
        IF NOT v_already_learned THEN
          v_xp_to_award := COALESCE(v_bitz.xp_value, 10);
          p_new_status := 'learned';
        END IF;
      ELSE
        v_is_correct := FALSE;
      END IF;
    END IF;

  ELSIF p_new_status = 'learned' AND NOT v_already_learned THEN
    v_xp_to_award := COALESCE(v_bitz.xp_value, 10);
  END IF;

  -- Upsert learning history (status never regresses from 'learned')
  INSERT INTO public.bitz_learning_history (
    user_id,
    bitz_id,
    status,
    quiz_attempted,
    quiz_correct,
    quiz_answers,
    xp_awarded,
    learned_at,
    last_interaction_at
  )
  VALUES (
    v_user_id,
    p_bitz_id,
    p_new_status,
    v_quiz_attempted,
    v_is_correct,
    v_quiz_answers,
    v_xp_to_award,
    CASE WHEN p_new_status = 'learned' THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, bitz_id) DO UPDATE SET
    status = CASE 
      WHEN bitz_learning_history.status = 'learned' THEN 'learned'
      ELSE EXCLUDED.status
    END,
    quiz_attempted = bitz_learning_history.quiz_attempted OR EXCLUDED.quiz_attempted,
    quiz_correct = CASE 
      WHEN EXCLUDED.quiz_attempted THEN EXCLUDED.quiz_correct
      ELSE bitz_learning_history.quiz_correct
    END,
    quiz_answers = COALESCE(EXCLUDED.quiz_answers, bitz_learning_history.quiz_answers),
    xp_awarded = bitz_learning_history.xp_awarded + EXCLUDED.xp_awarded,
    learned_at = COALESCE(bitz_learning_history.learned_at, EXCLUDED.learned_at),
    last_interaction_at = NOW(),
    updated_at = NOW();

  -- Award XP to user profile (only when transitioning to 'learned' for first time)
  IF p_new_status = 'learned' AND NOT v_already_learned THEN
    UPDATE public.knowledge_bitz
    SET completions_count = completions_count + 1
    WHERE id = p_bitz_id;

    BEGIN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_xp_to_award
      WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  ELSIF v_xp_to_award > 0 AND NOT v_already_learned THEN
    -- Award per-question XP even before full completion
    BEGIN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_xp_to_award
      WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_new_status,
    'isCorrect', v_is_correct,
    'xpAwarded', v_xp_to_award,
    'alreadyLearned', v_already_learned,
    'questionIndex', p_question_index,
    'totalQuestionsAnswered', v_total_answered,
    'explanation', CASE 
      WHEN v_quiz_is_array AND p_question_index IS NOT NULL 
      THEN v_bitz.quiz->p_question_index->>'explanation'
      ELSE v_bitz.quiz->>'explanation'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
