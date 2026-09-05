-- ============================================================================
-- EDTECHRA-BITZ: Synchronize Knowledge Bitz Code Sequence
-- Migration: 20260918000000_sync_knowledge_bitz_code_seq.sql
--
-- Ensures seq_knowledge_bitz_code is set strictly above the maximum existing
-- bitz_code in public.knowledge_bitz to prevent "knowledge_bitz_bitz_code_key"
-- unique constraint violation errors during inserts.
-- ============================================================================

DO $$
DECLARE
  v_max_num INT;
BEGIN
  -- Extract maximum numeric suffix from all existing bitz_code entries (e.g. 'B000165' -> 165)
  SELECT COALESCE(MAX(SUBSTRING(bitz_code FROM 2)::INT), 0)
  INTO v_max_num
  FROM public.knowledge_bitz
  WHERE bitz_code ~* '^B[0-9]+$';

  IF v_max_num > 0 THEN
    -- Advance sequence to v_max_num + 1
    PERFORM setval('public.seq_knowledge_bitz_code', v_max_num + 1, false);
    RAISE NOTICE 'Successfully synchronized public.seq_knowledge_bitz_code to %', v_max_num + 1;
  END IF;
END $$;
