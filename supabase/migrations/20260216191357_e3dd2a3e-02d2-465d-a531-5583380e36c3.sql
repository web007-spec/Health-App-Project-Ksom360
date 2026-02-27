
-- Sport profile for each client (position, jersey number, etc.)
CREATE TABLE public.client_sport_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  sport TEXT NOT NULL DEFAULT 'softball',
  position TEXT,
  jersey_number TEXT,
  team_name TEXT,
  throws TEXT,  -- 'right' or 'left'
  bats TEXT,    -- 'right', 'left', 'switch'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, trainer_id)
);

ALTER TABLE public.client_sport_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their sport profile"
  ON public.client_sport_profiles FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can manage client sport profiles"
  ON public.client_sport_profiles FOR ALL
  USING (auth.uid() = trainer_id);

CREATE TRIGGER update_client_sport_profiles_updated_at
  BEFORE UPDATE ON public.client_sport_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-game stat entries linked to sport_schedule_events
CREATE TABLE public.game_stat_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  sport_event_id UUID REFERENCES public.sport_schedule_events(id) ON DELETE CASCADE,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opponent TEXT,
  result TEXT,  -- 'win', 'loss', 'tie'
  -- Batting stats
  at_bats INTEGER DEFAULT 0,
  hits INTEGER DEFAULT 0,
  singles INTEGER DEFAULT 0,
  doubles INTEGER DEFAULT 0,
  triples INTEGER DEFAULT 0,
  home_runs INTEGER DEFAULT 0,
  runs INTEGER DEFAULT 0,
  rbis INTEGER DEFAULT 0,
  walks INTEGER DEFAULT 0,
  strikeouts INTEGER DEFAULT 0,
  stolen_bases INTEGER DEFAULT 0,
  -- Fielding
  errors INTEGER DEFAULT 0,
  -- Pitching (optional)
  innings_pitched NUMERIC DEFAULT 0,
  pitch_strikeouts INTEGER DEFAULT 0,
  earned_runs INTEGER DEFAULT 0,
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_stat_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage their game stats"
  ON public.game_stat_entries FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers can view client game stats"
  ON public.game_stat_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = game_stat_entries.client_id AND tc.trainer_id = auth.uid()
  ));

CREATE POLICY "Trainers can manage client game stats"
  ON public.game_stat_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.client_id = game_stat_entries.client_id AND tc.trainer_id = auth.uid()
  ));

CREATE TRIGGER update_game_stat_entries_updated_at
  BEFORE UPDATE ON public.game_stat_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
