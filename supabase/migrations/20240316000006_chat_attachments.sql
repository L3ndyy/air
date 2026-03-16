-- Chat file attachments: add column and storage bucket

-- 1) Allow optional attachment URL on messages
alter table public.messages
  add column if not exists attachment_url text;

-- 2) Bucket for chat files (public read, authenticated upload per user)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-files',
  'chat-files',
  true,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed'
  ]
)
on conflict (id) do nothing;

-- Public read
create policy "Chat files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-files');

-- Authenticated users upload to path: conversation_id/user_id/filename (user_id must match auth)
create policy "Users can upload chat files to own segment"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-files'
    and auth.uid() is not null
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete own chat uploads"
  on storage.objects for delete
  using (
    bucket_id = 'chat-files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
