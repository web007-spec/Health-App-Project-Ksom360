
-- Create vibes_tags table for trainer-customizable tags
CREATE TABLE public.vibes_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vibes_tags ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tags (they're shared configuration)
CREATE POLICY "Tags are readable by everyone"
  ON public.vibes_tags FOR SELECT
  USING (true);

-- Allow authenticated users (trainers) to manage tags
CREATE POLICY "Authenticated users can manage tags"
  ON public.vibes_tags FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed default tags from the current hardcoded list
INSERT INTO public.vibes_tags (name, slug, sort_order) VALUES
  ('Nature', 'nature', 0),
  ('Rain', 'rain', 1),
  ('ASMR', 'asmr', 2),
  ('Colored Noise', 'colored-noise', 3),
  ('Brainwaves', 'brainwaves', 4),
  ('Musical', 'musical', 5),
  ('Sleep', 'sleep', 6),
  ('Meditation', 'meditation', 7),
  ('Ambient', 'ambient', 8);
