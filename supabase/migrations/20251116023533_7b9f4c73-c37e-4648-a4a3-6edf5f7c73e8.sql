-- Create avatars storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
create policy "Avatars are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'avatars');