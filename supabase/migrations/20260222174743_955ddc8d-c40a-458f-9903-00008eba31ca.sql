
-- Guided sessions table (admin-managed templates for breathwork, focus, wind-down)
CREATE TABLE public.restore_guided_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'breathwork', -- breathwork, focus, wind_down, sleep
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  icon_name TEXT DEFAULT 'Wind',
  thumbnail_url TEXT,
  ambient_sound_id UUID REFERENCES public.vibes_sounds(id) ON DELETE SET NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  time_of_day_priority TEXT[], -- e.g. {'morning','evening'}
  breathing_pattern JSONB, -- e.g. {"inhale":4,"hold":7,"exhale":8}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice versions per session (male/female narration uploads)
CREATE TABLE public.restore_session_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.restore_guided_sessions(id) ON DELETE CASCADE,
  voice_label TEXT NOT NULL DEFAULT 'default', -- 'male', 'female', 'default'
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sleep stories table
CREATE TABLE public.restore_sleep_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  story_type TEXT NOT NULL DEFAULT 'story', -- 'story', 'long_loop'
  thumbnail_url TEXT,
  ambient_sound_id UUID REFERENCES public.vibes_sounds(id) ON DELETE SET NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice versions for sleep stories (male/female)
CREATE TABLE public.restore_story_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.restore_sleep_stories(id) ON DELETE CASCADE,
  voice_label TEXT NOT NULL DEFAULT 'default',
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restore_guided_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_session_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_sleep_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_story_voices ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own sessions
CREATE POLICY "Trainers manage own guided sessions"
  ON public.restore_guided_sessions FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Clients can view published sessions (via their trainer)
CREATE POLICY "Clients view published guided sessions"
  ON public.restore_guided_sessions FOR SELECT
  USING (is_published = true);

-- Voice versions readable by anyone who can see the session
CREATE POLICY "Anyone can read session voices"
  ON public.restore_session_voices FOR SELECT
  USING (true);

CREATE POLICY "Trainers manage session voices"
  ON public.restore_session_voices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.restore_guided_sessions s WHERE s.id = session_id AND s.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restore_guided_sessions s WHERE s.id = session_id AND s.trainer_id = auth.uid())
  );

-- Sleep stories policies
CREATE POLICY "Trainers manage own sleep stories"
  ON public.restore_sleep_stories FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Clients view published sleep stories"
  ON public.restore_sleep_stories FOR SELECT
  USING (is_published = true);

CREATE POLICY "Anyone can read story voices"
  ON public.restore_story_voices FOR SELECT
  USING (true);

CREATE POLICY "Trainers manage story voices"
  ON public.restore_story_voices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.restore_sleep_stories s WHERE s.id = story_id AND s.trainer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.restore_sleep_stories s WHERE s.id = story_id AND s.trainer_id = auth.uid())
  );

-- Storage buckets for audio uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('restore-audio', 'restore-audio', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies for restore-audio
CREATE POLICY "Anyone can read restore audio" ON storage.objects FOR SELECT USING (bucket_id = 'restore-audio');
CREATE POLICY "Trainers can upload restore audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'restore-audio' AND auth.role() = 'authenticated');
CREATE POLICY "Trainers can update restore audio" ON storage.objects FOR UPDATE USING (bucket_id = 'restore-audio' AND auth.role() = 'authenticated');
CREATE POLICY "Trainers can delete restore audio" ON storage.objects FOR DELETE USING (bucket_id = 'restore-audio' AND auth.role() = 'authenticated');

-- Updated_at trigger
CREATE TRIGGER update_restore_guided_sessions_updated_at
  BEFORE UPDATE ON public.restore_guided_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restore_sleep_stories_updated_at
  BEFORE UPDATE ON public.restore_sleep_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
