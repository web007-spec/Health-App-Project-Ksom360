
-- Fix overly permissive INSERT policy on system_events
DROP POLICY IF EXISTS "System can insert events" ON public.system_events;

CREATE POLICY "Authenticated users can insert events"
  ON public.system_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
