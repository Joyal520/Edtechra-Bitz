-- ============================================================================
-- EDTECHRA-BITZ: Expand Games & Training Catalog Support (Non-Destructive)
-- Replaces the fixed 5-game CHECK constraint on teacher_game_library with a
-- non-empty check so existing and future training activities can be saved.
-- ============================================================================

ALTER TABLE public.teacher_game_library
    DROP CONSTRAINT IF EXISTS teacher_game_library_game_id_check;

ALTER TABLE public.teacher_game_library
    DROP CONSTRAINT IF EXISTS teacher_game_library_game_id_nonempty;

ALTER TABLE public.teacher_game_library
    ADD CONSTRAINT teacher_game_library_game_id_nonempty
    CHECK (char_length(trim(game_id)) > 0);
