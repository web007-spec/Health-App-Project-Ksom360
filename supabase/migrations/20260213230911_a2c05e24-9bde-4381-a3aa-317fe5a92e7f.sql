-- Create storage bucket for workout cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-covers', 'workout-covers', true);

-- Allow trainers to upload workout covers
CREATE POLICY "Trainers can upload workout covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'workout-covers' AND auth.uid() IS NOT NULL);

-- Allow public read access to workout covers
CREATE POLICY "Anyone can view workout covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'workout-covers');

-- Allow trainers to update their workout covers
CREATE POLICY "Trainers can update workout covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'workout-covers' AND auth.uid() IS NOT NULL);

-- Allow trainers to delete their workout covers
CREATE POLICY "Trainers can delete workout covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'workout-covers' AND auth.uid() IS NOT NULL);