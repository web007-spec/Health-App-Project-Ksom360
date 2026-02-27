
-- Studio Programs table
CREATE TABLE public.studio_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their studio programs"
ON public.studio_programs FOR ALL
USING (auth.uid() = trainer_id);

-- Client access table
CREATE TABLE public.client_studio_program_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.studio_programs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE,
  current_week INTEGER DEFAULT 1,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, client_id)
);

ALTER TABLE public.client_studio_program_access ENABLE ROW LEVEL SECURITY;

-- Now add client view policy on studio_programs (access table exists now)
CREATE POLICY "Clients can view assigned studio programs"
ON public.studio_programs FOR SELECT
USING (id IN (
  SELECT program_id FROM public.client_studio_program_access
  WHERE client_id = auth.uid()
));

CREATE POLICY "Trainers can manage client program access"
ON public.client_studio_program_access FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.studio_programs
  WHERE studio_programs.id = client_studio_program_access.program_id
  AND studio_programs.trainer_id = auth.uid()
));

CREATE POLICY "Clients can view their program access"
ON public.client_studio_program_access FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their program progress"
ON public.client_studio_program_access FOR UPDATE
USING (auth.uid() = client_id);

CREATE TRIGGER update_studio_programs_updated_at
BEFORE UPDATE ON public.studio_programs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
