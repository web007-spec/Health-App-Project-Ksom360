-- Create storage bucket for exercise videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to exercise videos
CREATE POLICY "Exercise videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos');

-- Allow authenticated users to upload their own exercise videos
CREATE POLICY "Users can upload their own exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own exercise videos
CREATE POLICY "Users can update their own exercise videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own exercise videos
CREATE POLICY "Users can delete their own exercise videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'exercise-videos' AND auth.uid()::text = (storage.foldername(name))[1]);