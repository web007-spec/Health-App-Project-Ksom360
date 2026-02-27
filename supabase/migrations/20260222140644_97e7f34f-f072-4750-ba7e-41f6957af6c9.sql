
-- Security definer function to check trainer role
CREATE OR REPLACE FUNCTION public.is_trainer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'trainer'
  )
$$;

-- ============ TABLES ============

CREATE TABLE public.vibes_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.vibes_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.vibes_categories(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  icon_url text,
  audio_url text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.vibes_mixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_public boolean DEFAULT false,
  share_slug text UNIQUE,
  cover_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.vibes_mix_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_id uuid NOT NULL REFERENCES public.vibes_mixes(id) ON DELETE CASCADE,
  sound_id uuid NOT NULL REFERENCES public.vibes_sounds(id) ON DELETE CASCADE,
  volume float DEFAULT 0.7,
  sort_order int DEFAULT 0
);

CREATE TABLE public.vibes_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sound_id uuid NOT NULL REFERENCES public.vibes_sounds(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, sound_id)
);

-- ============ TRIGGERS ============

CREATE TRIGGER update_vibes_sounds_updated_at
  BEFORE UPDATE ON public.vibes_sounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============

ALTER TABLE public.vibes_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_mix_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibes_favorites ENABLE ROW LEVEL SECURITY;

-- vibes_categories
CREATE POLICY "Anyone can view categories" ON public.vibes_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can insert categories" ON public.vibes_categories FOR INSERT TO authenticated WITH CHECK (public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can update categories" ON public.vibes_categories FOR UPDATE TO authenticated USING (public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can delete categories" ON public.vibes_categories FOR DELETE TO authenticated USING (public.is_trainer(auth.uid()));

-- vibes_sounds
CREATE POLICY "Anyone can view sounds" ON public.vibes_sounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can insert sounds" ON public.vibes_sounds FOR INSERT TO authenticated WITH CHECK (public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can update sounds" ON public.vibes_sounds FOR UPDATE TO authenticated USING (public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can delete sounds" ON public.vibes_sounds FOR DELETE TO authenticated USING (public.is_trainer(auth.uid()));

-- vibes_mixes
CREATE POLICY "Users can view public or own mixes" ON public.vibes_mixes FOR SELECT TO authenticated USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users can insert own mixes" ON public.vibes_mixes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own mixes" ON public.vibes_mixes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own mixes" ON public.vibes_mixes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- vibes_mix_items
CREATE POLICY "Users can view mix items of visible mixes" ON public.vibes_mix_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vibes_mixes WHERE id = mix_id AND (is_public = true OR user_id = auth.uid())));
CREATE POLICY "Users can insert items in own mixes" ON public.vibes_mix_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vibes_mixes WHERE id = mix_id AND user_id = auth.uid()));
CREATE POLICY "Users can update items in own mixes" ON public.vibes_mix_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vibes_mixes WHERE id = mix_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete items in own mixes" ON public.vibes_mix_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vibes_mixes WHERE id = mix_id AND user_id = auth.uid()));

-- vibes_favorites
CREATE POLICY "Users can view own favorites" ON public.vibes_favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own favorites" ON public.vibes_favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own favorites" ON public.vibes_favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ STORAGE BUCKETS ============

INSERT INTO storage.buckets (id, name, public) VALUES ('vibes-audio', 'vibes-audio', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vibes-icons', 'vibes-icons', true);

-- Storage RLS: anyone authenticated can read
CREATE POLICY "Anyone can view vibes audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vibes-audio');
CREATE POLICY "Anyone can view vibes icons" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vibes-icons');

-- Trainers can upload/update/delete
CREATE POLICY "Trainers can upload vibes audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vibes-audio' AND public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can update vibes audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vibes-audio' AND public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can delete vibes audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vibes-audio' AND public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can upload vibes icons" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vibes-icons' AND public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can update vibes icons" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vibes-icons' AND public.is_trainer(auth.uid()));
CREATE POLICY "Trainers can delete vibes icons" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vibes-icons' AND public.is_trainer(auth.uid()));
