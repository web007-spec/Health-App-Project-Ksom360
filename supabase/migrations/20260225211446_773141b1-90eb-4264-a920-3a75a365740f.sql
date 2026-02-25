
-- Create workout-videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-videos', 'workout-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos
CREATE POLICY "Trainers can upload workout videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'workout-videos');

-- Allow public read access
CREATE POLICY "Public can view workout videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'workout-videos');

-- Allow owners to delete their videos
CREATE POLICY "Trainers can delete own workout videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'workout-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
