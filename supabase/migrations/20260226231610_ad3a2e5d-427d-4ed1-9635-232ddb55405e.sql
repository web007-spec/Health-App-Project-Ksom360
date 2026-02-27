
CREATE TABLE public.dashboard_card_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one default per trainer (client_id IS NULL) and one per client
CREATE UNIQUE INDEX idx_dashboard_layout_trainer_default ON public.dashboard_card_layouts (trainer_id) WHERE client_id IS NULL;
CREATE UNIQUE INDEX idx_dashboard_layout_client ON public.dashboard_card_layouts (client_id) WHERE client_id IS NOT NULL;

-- RLS
ALTER TABLE public.dashboard_card_layouts ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own layouts
CREATE POLICY "Trainers can manage dashboard layouts" ON public.dashboard_card_layouts
  FOR ALL USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can read their own layout
CREATE POLICY "Clients can read own layout" ON public.dashboard_card_layouts
  FOR SELECT USING (client_id = auth.uid());

-- Clients can read their trainer's default layout
CREATE POLICY "Clients can read trainer default layout" ON public.dashboard_card_layouts
  FOR SELECT USING (
    client_id IS NULL AND
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = dashboard_card_layouts.trainer_id
      AND tc.client_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE TRIGGER update_dashboard_card_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_card_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
