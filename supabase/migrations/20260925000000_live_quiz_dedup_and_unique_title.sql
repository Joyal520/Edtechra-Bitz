-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz Deduplication & Unique Title Protection Migration
-- ============================================================================

-- 1. Safely identify and clean up existing duplicate quizzes before creating unique index.
-- Merges redundant copies of quizzes with matching (created_by, normalized_title).
DO $$
DECLARE
    r RECORD;
    canonical_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Loop through duplicate groups
    FOR r IN
        SELECT 
            created_by,
            lower(trim(regexp_replace(title, '\s+', ' ', 'g'))) AS norm_title,
            array_agg(id ORDER BY created_at ASC) AS id_list
        FROM public.live_quizzes
        WHERE created_by IS NOT NULL
        GROUP BY created_by, lower(trim(regexp_replace(title, '\s+', ' ', 'g')))
        HAVING count(*) > 1
    LOOP
        -- First element is canonical (earliest created)
        canonical_id := r.id_list[1];
        duplicate_ids := r.id_list[2:array_length(r.id_list, 1)];

        -- Repoint live_quiz_sessions
        UPDATE public.live_quiz_sessions
        SET quiz_id = canonical_id
        WHERE quiz_id = ANY(duplicate_ids);

        -- Repoint live_quiz_results
        UPDATE public.live_quiz_results
        SET quiz_id = canonical_id
        WHERE quiz_id = ANY(duplicate_ids);

        -- Delete duplicate questions
        DELETE FROM public.live_quiz_questions
        WHERE quiz_id = ANY(duplicate_ids);

        -- Delete duplicate quizzes
        DELETE FROM public.live_quizzes
        WHERE id = ANY(duplicate_ids);
    END LOOP;
END $$;

-- 2. Add partial unique index on owner + normalized quiz title
-- Normalization: lower-cased, trimmed, whitespace collapsed to single space
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_quizzes_owner_norm_title 
ON public.live_quizzes (created_by, lower(trim(regexp_replace(title, '\s+', ' ', 'g')))) 
WHERE created_by IS NOT NULL;
