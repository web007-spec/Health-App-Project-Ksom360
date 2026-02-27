
-- Map specific breathing exercises to pinned music tracks
CREATE TABLE public.breathing_exercise_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  track_id UUID NOT NULL REFERENCES public.breathing_music_tracks(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, trainer_id)
);

ALTER TABLE public.breathing_exercise_music ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their exercise music" ON public.breathing_exercise_music
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Clients can read exercise music" ON public.breathing_exercise_music
  FOR SELECT USING (true);
