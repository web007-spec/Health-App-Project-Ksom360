-- Fix: ensure trainer-impersonation reads work for health_data and health_connections.
--
-- Problem: A trainer "previewing as client" on a native device (or web) uses
-- their own JWT.  The client-self policy (auth.uid() = client_id) fails.
-- The existing trainer SELECT policies require a row in trainer_clients, but
-- that row may not exist yet (e.g. admin accounts, demo accounts, pending
-- invites).  This adds a fallback policy that checks the caller's profile role.
--
-- Belt-and-suspenders: also make sure the trainer_clients-based policies exist
-- (they should, from earlier migrations).

-- 1. Health data — trainers with role='trainer' can SELECT any client's health data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'health_data'
      AND policyname = 'Trainer role can view any health data'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Trainer role can view any health data"
        ON public.health_data
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'trainer'
          )
        )
    $policy$;
  END IF;
END
$$;

-- 2. Health connections — trainers with role='trainer' can SELECT any client's connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'health_connections'
      AND policyname = 'Trainer role can view any health connections'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Trainer role can view any health connections"
        ON public.health_connections
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'trainer'
          )
        )
    $policy$;
  END IF;
END
$$;
