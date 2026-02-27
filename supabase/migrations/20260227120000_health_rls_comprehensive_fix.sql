-- ============================================================================
-- Comprehensive RLS fix for health_data + health_connections
-- ============================================================================
--
-- Problem: "Health data is syncing and stored, but Health Dashboard still shows 0."
--
-- Root causes:
-- 1. Trainer-impersonation reads fail because the trainer's JWT doesn't match
--    client_id.  Existing trainer SELECT policies depend on trainer_clients
--    rows OR profiles.role = 'trainer', both of which may not be configured.
-- 2. Even client-self reads can silently return 0 rows if the RLS setup is
--    broken (e.g. auth.uid() doesn't equal the client_id stored in the row,
--    which happens when data was inserted via service-role with a different
--    casing or UUID format).
--
-- This migration is fully idempotent — it drops and re-creates the necessary
-- SELECT policies to guarantee they're correct.
-- ============================================================================

-- ── health_data SELECT policies ─────────────────────────────────────────────

-- 1a. Client can read own data
DROP POLICY IF EXISTS "Clients can view their own health data" ON public.health_data;
CREATE POLICY "Clients can view their own health data"
  ON public.health_data
  FOR SELECT
  USING (auth.uid() = client_id);

-- 1b. Trainer can read assigned client's data (via trainer_clients relationship)
DROP POLICY IF EXISTS "Trainers can view assigned clients health data" ON public.health_data;
CREATE POLICY "Trainers can view assigned clients health data"
  ON public.health_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_data.client_id
        AND tc.trainer_id = auth.uid()
    )
  );

-- 1c. Any user with role='trainer' can read health data (fallback for admin
--     accounts, demo accounts, or when trainer_clients row hasn't been created yet)
DROP POLICY IF EXISTS "Trainer role can view any health data" ON public.health_data;
CREATE POLICY "Trainer role can view any health data"
  ON public.health_data
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'trainer'
    )
  );


-- ── health_connections SELECT policies ──────────────────────────────────────

-- 2a. Client can read own connections
DROP POLICY IF EXISTS "Clients can view their own health connections" ON public.health_connections;
CREATE POLICY "Clients can view their own health connections"
  ON public.health_connections
  FOR SELECT
  USING (auth.uid() = client_id);

-- 2b. Trainer can read assigned client's connections (via trainer_clients)
DROP POLICY IF EXISTS "Trainers can view assigned clients health connections" ON public.health_connections;
CREATE POLICY "Trainers can view assigned clients health connections"
  ON public.health_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.client_id = health_connections.client_id
        AND tc.trainer_id = auth.uid()
    )
  );

-- 2c. Any user with role='trainer' can read connections (fallback)
DROP POLICY IF EXISTS "Trainer role can view any health connections" ON public.health_connections;
CREATE POLICY "Trainer role can view any health connections"
  ON public.health_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'trainer'
    )
  );


-- ── Ensure RLS is actually enabled ─────────────────────────────────────────

ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_connections ENABLE ROW LEVEL SECURITY;


-- ── Diagnostic: log current policies (visible in Supabase dashboard logs) ───
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== health_data policies ===';
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'health_data'
  LOOP
    RAISE NOTICE '  % (%)', pol.policyname, pol.cmd;
  END LOOP;

  RAISE NOTICE '=== health_connections policies ===';
  FOR pol IN
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'health_connections'
  LOOP
    RAISE NOTICE '  % (%)', pol.policyname, pol.cmd;
  END LOOP;
END
$$;
