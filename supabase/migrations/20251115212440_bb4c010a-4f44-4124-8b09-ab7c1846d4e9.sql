-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-images', 'exercise-images', true);

-- Create RLS policies for exercise images
CREATE POLICY "Trainers can upload their exercise images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Exercise images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'exercise-images');

CREATE POLICY "Trainers can update their exercise images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exercise-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can delete their exercise images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercise-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);