
-- Table for breathing background music tracks
CREATE TABLE public.breathing_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.breathing_music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their music tracks"
  ON public.breathing_music_tracks FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Clients can view active music tracks"
  ON public.breathing_music_tracks FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_breathing_music_tracks_updated_at
  BEFORE UPDATE ON public.breathing_music_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for breathing music files
INSERT INTO storage.buckets (id, name, public) VALUES ('breathing-music', 'breathing-music', true);

CREATE POLICY "Trainers can upload breathing music"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'breathing-music' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view breathing music"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'breathing-music');

CREATE POLICY "Trainers can delete their breathing music"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'breathing-music' AND auth.role() = 'authenticated');
