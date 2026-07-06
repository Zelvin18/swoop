-- ============================================================
-- SWOOP POST TYPES SCHEMA UPDATE
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Add post_type and service fields to posts table
alter table posts
  add column if not exists post_type text default 'product'
    check (post_type in ('product','social','service')),

  -- Social post fields
  add column if not exists caption text,

  -- Service post fields
  add column if not exists service_category  text,
  add column if not exists service_rate      numeric,
  add column if not exists service_rate_type text default 'fixed'
    check (service_rate_type in ('fixed','hourly','starting_at','negotiable')),
  add column if not exists service_features  text[] default '{}',
  add column if not exists service_duration  text,
  add column if not exists service_badge     text;

-- Index for filtering by post type in feed
create index if not exists posts_post_type_idx on posts (post_type) where status = 'active';

-- Update RLS: social posts are always visible (no draft restriction)
-- Products and services follow same rule
-- Already covered by existing policy "Anyone can view active posts"
