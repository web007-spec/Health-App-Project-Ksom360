-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true);

-- Create storage bucket for recipe book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-book-covers', 'recipe-book-covers', true);

-- RLS policies for recipe-images bucket
CREATE POLICY "Trainers can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can update their recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can delete their recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view recipe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- RLS policies for recipe-book-covers bucket
CREATE POLICY "Trainers can upload recipe book covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can update their recipe book covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can delete their recipe book covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view recipe book covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-book-covers');