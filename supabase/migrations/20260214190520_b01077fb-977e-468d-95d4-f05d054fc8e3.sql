
-- Create habit_comments table for client-trainer communication on habits
CREATE TABLE public.habit_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.client_habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.habit_comments ENABLE ROW LEVEL SECURITY;

-- Clients can view comments on their own habits
CREATE POLICY "Users can view habit comments on their habits"
ON public.habit_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_habits h
    WHERE h.id = habit_comments.habit_id
    AND (h.client_id = auth.uid() OR h.trainer_id = auth.uid())
  )
);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own habit comments"
ON public.habit_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.client_habits h
    WHERE h.id = habit_comments.habit_id
    AND (h.client_id = auth.uid() OR h.trainer_id = auth.uid())
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own habit comments"
ON public.habit_comments FOR DELETE
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_habit_comments_habit_id ON public.habit_comments(habit_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_comments;
