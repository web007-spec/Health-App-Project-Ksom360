
-- Recurring check-in/check-out schedules
CREATE TABLE public.recurring_checkin_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  template_id UUID REFERENCES public.task_templates(id),
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'checkin', -- 'checkin' or 'checkout'
  frequency TEXT NOT NULL DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly', 'monthly'
  day_of_week INT, -- 0=Sun..6=Sat for weekly/biweekly
  day_of_month INT, -- 1-28 for monthly
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_auto_draft BOOLEAN NOT NULL DEFAULT false, -- auto-generate AI response when completed
  ai_auto_send BOOLEAN NOT NULL DEFAULT false, -- auto-send AI draft without coach review
  last_triggered_at TIMESTAMPTZ,
  next_trigger_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_checkin_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their schedules"
  ON public.recurring_checkin_schedules FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Clients can view their schedules"
  ON public.recurring_checkin_schedules FOR SELECT
  USING (client_id = auth.uid());

CREATE TRIGGER update_recurring_checkin_schedules_updated_at
  BEFORE UPDATE ON public.recurring_checkin_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track AI auto-drafted responses for scheduled check-ins
CREATE TABLE public.checkin_auto_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.recurring_checkin_schedules(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.client_tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  draft_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'sent', 'dismissed'
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_auto_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage drafts"
  ON public.checkin_auto_drafts FOR ALL
  USING (trainer_id = auth.uid());

CREATE TRIGGER update_checkin_auto_drafts_updated_at
  BEFORE UPDATE ON public.checkin_auto_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
