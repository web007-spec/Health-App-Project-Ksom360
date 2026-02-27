
-- Quick fasting plans (ratio-based daily schedules like 16:8, 18:6)
CREATE TABLE public.quick_fasting_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  fast_hours INTEGER NOT NULL,
  eat_hours INTEGER NOT NULL,
  difficulty_group TEXT NOT NULL DEFAULT 'beginner',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_fasting_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quick fasting plans"
  ON public.quick_fasting_plans FOR SELECT
  USING (true);

-- Seed quick plans data
INSERT INTO public.quick_fasting_plans (name, fast_hours, eat_hours, difficulty_group, order_index) VALUES
  ('11:13', 11, 13, 'beginner', 1),
  ('12:12', 12, 12, 'beginner', 2),
  ('13:11', 13, 11, 'beginner', 3),
  ('14:10', 14, 10, 'beginner', 4),
  ('15:9', 15, 9, 'beginner', 5),
  ('16:8', 16, 8, 'intermediate', 6),
  ('17:7', 17, 7, 'intermediate', 7),
  ('18:6', 18, 6, 'intermediate', 8),
  ('19:5', 19, 5, 'intermediate', 9),
  ('20:4', 20, 4, 'advanced', 10),
  ('21:3', 21, 3, 'advanced', 11),
  ('22:2', 22, 2, 'advanced', 12),
  ('23:1', 23, 1, 'advanced', 13),
  ('24h', 24, 0, 'long_fasts', 14),
  ('36h', 36, 0, 'long_fasts', 15),
  ('42h', 42, 0, 'long_fasts', 16),
  ('48h', 48, 0, 'long_fasts', 17),
  ('72h', 72, 0, 'long_fasts', 18);

-- Add quick_plan_id to client_feature_settings for when a client selects a quick plan
ALTER TABLE public.client_feature_settings 
  ADD COLUMN IF NOT EXISTS selected_quick_plan_id UUID REFERENCES public.quick_fasting_plans(id);
