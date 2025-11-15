-- Create enum for task types
CREATE TYPE task_type AS ENUM ('general', 'progress_photo', 'body_metrics', 'form', 'habit');

-- Create task_templates table for the task library
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  task_type task_type NOT NULL DEFAULT 'general',
  description TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 24,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_tasks table for assigned tasks
CREATE TABLE public.client_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  task_type task_type NOT NULL DEFAULT 'general',
  description TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  due_date DATE,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 24,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_templates
CREATE POLICY "Trainers can manage their task templates"
  ON public.task_templates
  FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can view shared templates"
  ON public.task_templates
  FOR SELECT
  USING (is_shared = true);

-- RLS Policies for client_tasks
CREATE POLICY "Trainers can manage their client tasks"
  ON public.client_tasks
  FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can view their tasks"
  ON public.client_tasks
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can update their tasks"
  ON public.client_tasks
  FOR UPDATE
  USING (auth.uid() = client_id);

-- Create trigger for updated_at
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_task_templates_trainer ON public.task_templates(trainer_id);
CREATE INDEX idx_task_templates_type ON public.task_templates(task_type);
CREATE INDEX idx_client_tasks_client ON public.client_tasks(client_id);
CREATE INDEX idx_client_tasks_trainer ON public.client_tasks(trainer_id);
CREATE INDEX idx_client_tasks_due_date ON public.client_tasks(due_date);