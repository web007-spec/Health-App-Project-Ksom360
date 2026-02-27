-- Add icon_url column to task_templates for custom icons/images
ALTER TABLE public.task_templates
ADD COLUMN icon_url TEXT;

-- Create storage bucket for task icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-icons', 'task-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for task icons
CREATE POLICY "Trainers can upload task icons"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can update their task icons"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'task-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can delete their task icons"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-icons' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Task icons are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-icons');