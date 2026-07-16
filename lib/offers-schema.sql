-- ============================================================
-- SWOOP OFFERS SCHEMA UPDATE
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Add missing fields to offers table
alter table offers
  add column if not exists images          text[]  default '{}',
  add column if not exists is_negotiable   boolean default false,
  add column if not exists condition_desc  text,
  add column if not exists storage         text,
  add column if not exists battery_health  text,
  add column if not exists includes        text,
  add column if not exists distance_km     numeric,
  add column if not exists views_count     int default 0;

-- Update RLS: sellers can see their own offers, buyers see offers on their requests
-- (already exists from requests-schema.sql, these are additive)

-- Enable realtime on offers (safe)
do $$ begin
  perform pg_catalog.set_config('search_path','public',false);
  alter publication supabase_realtime add table offers;
exception when others then null;
end $$;

-- Storage bucket for offer images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images', 'offer-images', true, 20971520,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Anyone can view offer images') then
    create policy "Anyone can view offer images"
      on storage.objects for select using (bucket_id = 'offer-images');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Sellers upload offer images') then
    create policy "Sellers upload offer images"
      on storage.objects for insert
      with check (bucket_id = 'offer-images' and auth.role() = 'authenticated');
  end if;
end $$;
