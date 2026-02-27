
-- Default metric definitions (global + trainer custom)
CREATE TABLE public.metric_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'body', -- body, measurement, performance, custom
  is_default boolean NOT NULL DEFAULT false,
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view default metrics"
  ON public.metric_definitions FOR SELECT
  USING (is_default = true);

CREATE POLICY "Trainers can view their custom metrics"
  ON public.metric_definitions FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their custom metrics"
  ON public.metric_definitions FOR ALL
  USING (auth.uid() = trainer_id);

-- Which metrics are enabled per client
CREATE TABLE public.client_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_definition_id uuid NOT NULL REFERENCES public.metric_definitions(id) ON DELETE CASCADE,
  is_pinned boolean NOT NULL DEFAULT false,
  goal_value numeric,
  starting_value numeric,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, metric_definition_id)
);

ALTER TABLE public.client_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their metrics"
  ON public.client_metrics FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can manage client metrics"
  ON public.client_metrics FOR ALL
  USING (auth.uid() = trainer_id);

-- Actual metric data entries
CREATE TABLE public.metric_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_metric_id uuid NOT NULL REFERENCES public.client_metrics(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their entries"
  ON public.metric_entries FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their entries"
  ON public.metric_entries FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers can manage client entries"
  ON public.metric_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.client_metrics cm
    WHERE cm.id = metric_entries.client_metric_id
    AND cm.trainer_id = auth.uid()
  ));

-- Seed default metric definitions
INSERT INTO public.metric_definitions (name, unit, category, is_default) VALUES
  ('Weight', 'lbs', 'body', true),
  ('Body Fat', '%', 'body', true),
  ('BMI', '', 'body', true),
  ('Lean Body Mass', 'lbs', 'body', true),
  ('Body Fat Mass', 'lbs', 'body', true),
  ('Chest', 'in', 'measurement', true),
  ('Waist', 'in', 'measurement', true),
  ('Hips', 'in', 'measurement', true),
  ('Shoulders', 'in', 'measurement', true),
  ('Right Arm', 'in', 'measurement', true),
  ('Left Arm', 'in', 'measurement', true),
  ('Right Thigh', 'in', 'measurement', true),
  ('Left Thigh', 'in', 'measurement', true),
  ('Right Calf', 'in', 'measurement', true),
  ('Left Calf', 'in', 'measurement', true),
  ('Neck', 'in', 'measurement', true),
  ('Steps', 'steps', 'performance', true),
  ('Heart Rate', 'bpm', 'performance', true),
  ('Sleep', 'hrs', 'performance', true);

-- Index for fast lookups
CREATE INDEX idx_metric_entries_client_metric ON public.metric_entries(client_metric_id, recorded_at DESC);
CREATE INDEX idx_client_metrics_client ON public.client_metrics(client_id);
