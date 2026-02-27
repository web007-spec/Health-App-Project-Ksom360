
-- Copilot messages table (stores AI-generated drafts)
CREATE TABLE public.copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  use_case text NOT NULL, -- 'plan_suggestion' | 'level_up' | 'insight_rephrase'
  engine_mode text NOT NULL,
  prompt_context jsonb DEFAULT '{}',
  response_text text NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their copilot messages"
  ON public.copilot_messages FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert copilot messages"
  ON public.copilot_messages FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their copilot messages"
  ON public.copilot_messages FOR UPDATE
  USING (auth.uid() = coach_id);

-- Copilot events table (audit logging)
CREATE TABLE public.copilot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  engine_mode text NOT NULL,
  coach_id uuid NOT NULL,
  client_id uuid NOT NULL,
  approved boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their copilot events"
  ON public.copilot_events FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert copilot events"
  ON public.copilot_events FOR INSERT
  WITH CHECK (auth.uid() = coach_id);
