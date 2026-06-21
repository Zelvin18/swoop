-- ============================================================
-- SWOOP MEDIA EDITOR SCHEMA
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Music tracks library (admin-managed)
create table if not exists music_tracks (
  id           uuid default gen_random_uuid() primary key,
  title        text not null,
  artist       text,
  genre        text,
  duration_sec int,
  file_url     text not null,
  cover_url    text,
  waveform     float[] default '{}',  -- normalised amplitude data for visualisation
  bpm          int,
  is_active    boolean default true,
  play_count   int default 0,
  created_at   timestamptz default now()
);
alter table music_tracks enable row level security;
create policy "Anyone can view active tracks"
  on music_tracks for select using (is_active = true);

-- Link posts to music
alter table posts
  add column if not exists music_track_id  uuid references music_tracks(id) on delete set null,
  add column if not exists music_start_sec int default 0,
  add column if not exists filter_name     text default 'Original',
  add column if not exists crop_data       jsonb;

-- Storage bucket for music
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-library',
  'music-library',
  true,
  20971520,  -- 20MB per track
  array['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav']
)
on conflict (id) do nothing;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='objects' and policyname='Anyone can stream music'
  ) then
    create policy "Anyone can stream music"
      on storage.objects for select using (bucket_id = 'music-library');
  end if;
end $$;

-- Increment play count
create or replace function increment_track_plays(track_id uuid)
returns void language sql as $$
  update music_tracks set play_count = play_count + 1 where id = track_id;
$$;
