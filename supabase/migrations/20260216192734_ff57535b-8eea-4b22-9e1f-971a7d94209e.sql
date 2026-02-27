
-- Add basketball-specific columns to game_stat_entries
ALTER TABLE public.game_stat_entries
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'baseball',
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rebounds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assists integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS steals integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS turnovers integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fouls integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_played integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fg_made integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fg_attempted integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS three_pt_made integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS three_pt_attempted integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ft_made integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ft_attempted integer DEFAULT 0;
