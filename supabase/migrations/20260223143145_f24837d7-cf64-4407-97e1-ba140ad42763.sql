
-- Add billing fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz;

-- Create billing_events table for revenue logging
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  event_type text NOT NULL,
  tier text,
  amount integer,
  stripe_event_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Trainers can view billing events for their clients
CREATE POLICY "Trainers can view billing events for their clients"
  ON public.billing_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_feature_settings cfs
      WHERE cfs.client_id = billing_events.client_id
        AND cfs.trainer_id = auth.uid()
    )
  );

-- Service role inserts (webhooks) — no user-facing insert policy needed
-- Clients can view their own billing events
CREATE POLICY "Clients can view own billing events"
  ON public.billing_events FOR SELECT
  USING (auth.uid() = client_id);
