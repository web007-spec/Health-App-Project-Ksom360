
-- Fix the overly permissive INSERT policy on health_notifications
-- The system inserts via edge functions (service role) so we can restrict to service role only
-- by checking that the caller is the service role (no auth.uid()) OR a trainer inserting their own

DROP POLICY IF EXISTS "System can insert health notifications" ON public.health_notifications;

CREATE POLICY "System can insert health notifications"
  ON public.health_notifications
  FOR INSERT
  WITH CHECK (
    -- Allow edge function (service role, no auth.uid) to insert
    auth.uid() IS NULL
    OR
    -- Allow trainers to insert their own notifications
    auth.uid() = trainer_id
  );
