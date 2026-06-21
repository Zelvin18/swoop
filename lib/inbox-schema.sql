-- ============================================================
-- SWOOP INBOX SCHEMA
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Stories
create table if not exists stories (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade,
  media_url      text not null,
  media_type     text default 'photo' check (media_type in ('photo','video')),
  music_track_id uuid references music_tracks(id) on delete set null,
  music_start_sec int default 0,
  caption        text,
  duration_sec   int default 5,
  views_count    int default 0,
  expires_at     timestamptz default (now() + interval '24 hours'),
  created_at     timestamptz default now()
);
alter table stories enable row level security;
create policy "Anyone can view stories" on stories for select using (expires_at > now());
create policy "Users manage own stories" on stories for all using (auth.uid() = user_id);

-- Story views
create table if not exists story_views (
  id         uuid default gen_random_uuid() primary key,
  story_id   uuid references stories(id) on delete cascade,
  viewer_id  uuid references profiles(id) on delete cascade,
  viewed_at  timestamptz default now(),
  unique(story_id, viewer_id)
);
alter table story_views enable row level security;
create policy "Users manage own story views" on story_views for all using (auth.uid() = viewer_id);

-- Increment story views
create or replace function increment_story_views(s_id uuid)
returns void language sql as $$
  update stories set views_count = views_count + 1 where id = s_id;
$$;

-- conversations and messages are already created in posts-complete-schema-v2.sql
-- Adding missing columns here safely

alter table conversations
  add column if not exists is_pinned   boolean default false,
  add column if not exists is_muted    boolean default false,
  add column if not exists context_type text default 'direct'
    check (context_type in ('direct','product','request','order')),
  add column if not exists context_id  uuid;

alter table messages
  add column if not exists message_type text default 'text'
    check (message_type in ('text','image','product_card','reservation','offer','system')),
  add column if not exists metadata    jsonb default '{}';

-- Enable realtime (safe)
do $$ begin
  perform pg_catalog.set_config('search_path', 'public', false);
  alter publication supabase_realtime add table stories;
exception when others then null;
end $$;

-- Storage bucket for stories
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  true,
  31457280,  -- 30MB
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Anyone can view stories media') then
    create policy "Anyone can view stories media"
      on storage.objects for select using (bucket_id = 'stories');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Users upload own story media') then
    create policy "Users upload own story media"
      on storage.objects for insert with check (bucket_id = 'stories' and auth.role() = 'authenticated');
  end if;
end $$;
