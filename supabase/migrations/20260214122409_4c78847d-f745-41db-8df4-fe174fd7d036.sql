
-- Feature settings per client (trainer controls what client sees)
CREATE TABLE public.client_feature_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  training_enabled boolean NOT NULL DEFAULT true,
  workout_comments_enabled boolean NOT NULL DEFAULT true,
  activity_logging_enabled boolean NOT NULL DEFAULT true,
  progress_photos_enabled boolean NOT NULL DEFAULT true,
  tasks_enabled boolean NOT NULL DEFAULT true,
  messages_enabled boolean NOT NULL DEFAULT true,
  food_journal_enabled boolean NOT NULL DEFAULT true,
  macros_enabled boolean NOT NULL DEFAULT true,
  body_metrics_enabled boolean NOT NULL DEFAULT true,
  goals_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, trainer_id)
);

ALTER TABLE public.client_feature_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage feature settings"
ON public.client_feature_settings FOR ALL
USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their feature settings"
ON public.client_feature_settings FOR SELECT
USING (auth.uid() = client_id);

-- Client notes (trainer notes about a client)
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their client notes"
ON public.client_notes FOR ALL
USING (auth.uid() = trainer_id);

-- Client goals & countdowns (set by trainer, shared with client)
CREATE TABLE public.client_goal_countdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('goal', 'countdown')),
  title text NOT NULL,
  description text,
  icon text DEFAULT '🎯',
  background_color text DEFAULT '#3b82f6',
  end_date timestamptz,
  notify_on_end boolean DEFAULT true,
  notify_day_before boolean DEFAULT false,
  notify_week_before boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_goal_countdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage client goals"
ON public.client_goal_countdowns FOR ALL
USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their goals"
ON public.client_goal_countdowns FOR SELECT
USING (auth.uid() = client_id);

-- Client macro targets (set by trainer for macro coaching)
CREATE TABLE public.client_macro_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  trainer_id uuid NOT NULL,
  tracking_option text NOT NULL DEFAULT 'all_macros' CHECK (tracking_option IN ('all_macros', 'calories_only', 'protein_and_calories')),
  target_calories integer,
  target_protein numeric,
  target_carbs numeric,
  target_fats numeric,
  rest_day_calories integer,
  rest_day_protein numeric,
  rest_day_carbs numeric,
  rest_day_fats numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, trainer_id)
);

ALTER TABLE public.client_macro_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage macro targets"
ON public.client_macro_targets FOR ALL
USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their macro targets"
ON public.client_macro_targets FOR SELECT
USING (auth.uid() = client_id);

-- Triggers for updated_at
CREATE TRIGGER update_client_feature_settings_updated_at
BEFORE UPDATE ON public.client_feature_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_goal_countdowns_updated_at
BEFORE UPDATE ON public.client_goal_countdowns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_macro_targets_updated_at
BEFORE UPDATE ON public.client_macro_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
