-- ============================================================================
-- Migration: Create shared_champions_certificates for short shareable URLs (/c/:shareId)
-- Stores read-only Class Champions achievement snapshots with teacher revocation
-- and optional expiration support.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shared_champions_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL UNIQUE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  classroom_name TEXT NOT NULL,
  period_label TEXT NOT NULL,
  champions JSONB NOT NULL DEFAULT '[]'::jsonb,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_champions_certificates_share_id
  ON public.shared_champions_certificates (share_id);

CREATE INDEX IF NOT EXISTS idx_shared_champions_certificates_classroom_created
  ON public.shared_champions_certificates (classroom_id, created_at DESC);

ALTER TABLE public.shared_champions_certificates ENABLE ROW LEVEL SECURITY;

-- Public visitors can only read intentionally shared, non-revoked, non-expired snapshots.
DROP POLICY IF EXISTS "Public can read active shared certificates" ON public.shared_champions_certificates;
CREATE POLICY "Public can read active shared certificates"
  ON public.shared_champions_certificates
  FOR SELECT
  TO anon, authenticated
  USING (
    revoked = false
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Classroom teachers/co-teachers/admins can read all certificates for their classrooms (including revoked).
DROP POLICY IF EXISTS "Teachers can read classroom certificates" ON public.shared_champions_certificates;
CREATE POLICY "Teachers can read classroom certificates"
  ON public.shared_champions_certificates
  FOR SELECT
  TO authenticated
  USING (
    public.check_is_classroom_teacher(classroom_id, auth.uid())
  );

-- Classroom teachers/co-teachers/admins can create certificates for their classrooms.
DROP POLICY IF EXISTS "Teachers can create classroom certificates" ON public.shared_champions_certificates;
CREATE POLICY "Teachers can create classroom certificates"
  ON public.shared_champions_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_classroom_teacher(classroom_id, auth.uid())
  );

-- Classroom teachers/co-teachers/admins can revoke/update certificates for their classrooms.
DROP POLICY IF EXISTS "Teachers can update classroom certificates" ON public.shared_champions_certificates;
CREATE POLICY "Teachers can update classroom certificates"
  ON public.shared_champions_certificates
  FOR UPDATE
  TO authenticated
  USING (
    public.check_is_classroom_teacher(classroom_id, auth.uid())
  )
  WITH CHECK (
    public.check_is_classroom_teacher(classroom_id, auth.uid())
  );
