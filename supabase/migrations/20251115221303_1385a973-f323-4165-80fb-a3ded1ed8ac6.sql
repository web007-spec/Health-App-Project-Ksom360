-- Create storage bucket for progress photos
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- RLS policies for progress-photos bucket
create policy "Users can upload their own progress photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view their own progress photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own progress photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Trainers can view client progress photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'progress-photos' AND
  exists (
    select 1 from trainer_clients tc
    where tc.client_id::text = (storage.foldername(name))[1]
    and tc.trainer_id = auth.uid()
  )
);