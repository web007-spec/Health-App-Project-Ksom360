
-- Notification events log table
CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engine_mode text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  dismissed_at timestamptz,
  suppression_reason text
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notification_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notification_events FOR UPDATE
  USING (user_id = auth.uid());

-- Allow system inserts (trainer or self)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notification_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_notification_events_user ON public.notification_events(user_id, sent_at DESC);

-- Add nudge preference columns to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS nudge_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nudge_frequency text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS quiet_hours_start text DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end text DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS nudge_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nudge_workout boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nudge_fasting boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nudge_sleep boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nudge_recovery boolean NOT NULL DEFAULT true;
