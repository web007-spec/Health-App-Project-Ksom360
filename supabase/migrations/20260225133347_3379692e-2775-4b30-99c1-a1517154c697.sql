CREATE POLICY "Trainers can upload resource files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-files');

CREATE POLICY "Anyone can read resource files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resource-files');

CREATE POLICY "Trainers can delete own resource files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resource-files');