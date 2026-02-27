
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_answers jsonb DEFAULT NULL;
