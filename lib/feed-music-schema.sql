-- ============================================================
-- SWOOP FEED MUSIC — Jamendo / external track metadata on posts
-- Run in Supabase SQL Editor → New Query
-- Safe to re-run
-- ============================================================

-- Jamendo IDs are numeric strings, not UUIDs — store metadata directly on posts
alter table posts
  add column if not exists music_external_id text,
  add column if not exists music_file_url    text,
  add column if not exists music_title       text,
  add column if not exists music_artist      text;

-- music_start_sec and filter_name should already exist from media-schema.sql
alter table posts
  add column if not exists music_start_sec int default 0,
  add column if not exists filter_name     text default 'Original';

create index if not exists posts_music_external_idx on posts (music_external_id)
  where music_external_id is not null;
