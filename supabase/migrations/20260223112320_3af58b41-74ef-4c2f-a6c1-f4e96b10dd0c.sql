
-- Daily check-in inputs for recommendation engines
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours NUMERIC(3,1),
  sleep_quality SMALLINT CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  nutrition_on_track BOOLEAN,
  recovery_completed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert own checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own checkins"
  ON public.daily_checkins FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client checkins"
  ON public.daily_checkins FOR SELECT
  USING (public.is_trainer(auth.uid()));

CREATE TRIGGER update_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Engine scores computed and cached
CREATE TABLE public.engine_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  engine_type TEXT NOT NULL CHECK (engine_type IN ('metabolic_stability', 'performance_readiness', 'game_readiness')),
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('strong', 'moderate', 'needs_support')),
  streak_days INTEGER NOT NULL DEFAULT 0,
  weekly_completion_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  recommendation TEXT CHECK (recommendation IN ('advance', 'maintain', 'reduce')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, engine_type)
);

ALTER TABLE public.engine_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own scores"
  ON public.engine_scores FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view client scores"
  ON public.engine_scores FOR SELECT
  USING (public.is_trainer(auth.uid()));

-- Service-level insert/update for edge function scoring
CREATE POLICY "Service can manage scores"
  ON public.engine_scores FOR ALL
  USING (true)
  WITH CHECK (true);
