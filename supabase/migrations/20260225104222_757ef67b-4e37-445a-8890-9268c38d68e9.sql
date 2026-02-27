
-- Table to store custom video URLs per breathing exercise
CREATE TABLE public.breathing_exercise_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  trainer_id UUID NOT NULL REFERENCES auth.users(id),
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, trainer_id)
);

-- RLS
ALTER TABLE public.breathing_exercise_videos ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own videos
CREATE POLICY "Trainers manage own exercise videos"
  ON public.breathing_exercise_videos
  FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can read videos (to play them)
CREATE POLICY "Clients can read exercise videos"
  ON public.breathing_exercise_videos
  FOR SELECT
  USING (true);

-- Create storage bucket for breathing videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('breathing-videos', 'breathing-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for breathing-videos bucket
CREATE POLICY "Trainers can upload breathing videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'breathing-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Trainers can update breathing videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'breathing-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Trainers can delete breathing videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'breathing-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can read breathing videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'breathing-videos');
