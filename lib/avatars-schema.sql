-- ============================================================
-- SWOOP AVATARS STORAGE
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Create avatars bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Anyone can view avatars') then
    create policy "Anyone can view avatars" on storage.objects for select using (bucket_id = 'avatars');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Users upload own avatar') then
    create policy "Users upload own avatar" on storage.objects for insert
      with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Users update own avatar') then
    create policy "Users update own avatar" on storage.objects for update
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- IMPORTANT: Go to Supabase Dashboard → Authentication → Settings
-- Set "Enable email confirmations" to OFF for demo testing
-- This allows users to sign up and login immediately without verifying email
