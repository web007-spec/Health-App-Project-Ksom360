ALTER TABLE public.client_sport_profiles
  ADD COLUMN IF NOT EXISTS season_status text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS season_override text;