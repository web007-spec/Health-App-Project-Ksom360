
-- Coach override log for all coach actions
CREATE TABLE public.coach_override_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  override_type text NOT NULL, -- 'plan', 'level', 'engine', 'safety', 'insight', 'approval', 'dismissal'
  old_value text,
  new_value text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_override_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their override logs"
  ON public.coach_override_log FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "Trainers can insert override logs"
  ON public.coach_override_log FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- Add safety control toggles to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS allow_plan_suggestions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_level_auto_advance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_coach_approval_plans boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_advanced_plans boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS athletic_safety_lock boolean NOT NULL DEFAULT true;

-- Add dismissal fields to recommendation_events
ALTER TABLE public.recommendation_events
  ADD COLUMN IF NOT EXISTS dismissed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissal_reason text,
  ADD COLUMN IF NOT EXISTS dismissal_note text,
  ADD COLUMN IF NOT EXISTS coach_id uuid;
