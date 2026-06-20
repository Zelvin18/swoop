-- Run in Supabase SQL Editor → New Query
-- Adds lat/lng to profiles for Nearby feature

alter table profiles
  add column if not exists lat  double precision,
  add column if not exists lng  double precision;

-- Index for spatial queries
create index if not exists profiles_lat_lng on profiles (lat, lng)
  where lat is not null and lng is not null;
