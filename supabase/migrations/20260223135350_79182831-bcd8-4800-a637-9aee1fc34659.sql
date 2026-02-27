
-- Guardian links table
CREATE TABLE public.guardian_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id),
  guardian_email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'invited',
  coach_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  linked_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- Add is_minor + parent link enabled to client_feature_settings
ALTER TABLE public.client_feature_settings
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_link_enabled boolean NOT NULL DEFAULT true;

-- RLS: Trainer can manage guardian links for their clients
CREATE POLICY "Trainers can manage guardian links"
  ON public.guardian_links FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Public read for token-based access (guardian view)
CREATE POLICY "Guardian can read own link by token"
  ON public.guardian_links FOR SELECT
  USING (true);
