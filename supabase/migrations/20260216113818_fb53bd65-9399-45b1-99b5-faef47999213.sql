
-- Add form_questions column to task_templates for storing check-in form structure
ALTER TABLE public.task_templates ADD COLUMN IF NOT EXISTS form_questions jsonb DEFAULT '[]'::jsonb;

-- Add form_questions column to client_tasks for storing submitted answers
ALTER TABLE public.client_tasks ADD COLUMN IF NOT EXISTS form_responses jsonb DEFAULT NULL;
