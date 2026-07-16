-- ============================================================
-- SWOOP: Requests & Offers Flow — DB Migration
-- Run this in Supabase SQL Editor → New Query
-- All statements are idempotent (safe to run multiple times)
-- ============================================================

-- 1. Add new detail columns to offers table
alter table offers
  add column if not exists negotiable      boolean default true,
  add column if not exists condition       text,
  add column if not exists storage         text,
  add column if not exists battery_health  text,
  add column if not exists includes        text;

-- Note: images text[] column already exists from offers-schema.sql
-- Note: is_negotiable may exist from offers-schema.sql — the new column
--       uses "negotiable" (shorter name) to match the JS code

-- 2. Make sure offers has the images column (in case offers-schema.sql wasn't run)
alter table offers
  add column if not exists images text[] default '{}';

-- 3. Ensure profiles has response_rate and joined_at (already in profile-schema.sql)
alter table profiles
  add column if not exists response_rate  int default 0,
  add column if not exists avg_rating     numeric(3,1) default 0,
  add column if not exists review_count   int default 0,
  add column if not exists joined_at      timestamptz default now();

-- 4. Ensure requests has lat/lng for distance sorting in OffersInbox
alter table requests
  add column if not exists lat numeric,
  add column if not exists lng numeric;

-- 5. Add increment_offers_count RPC if it doesn't exist
create or replace function increment_offers_count(req_id uuid)
returns void language sql security definer as $$
  update requests
  set offers_count = coalesce(offers_count, 0) + 1
  where id = req_id;
$$;

-- 6. Ensure offers_count column exists on requests
alter table requests
  add column if not exists offers_count int default 0;

-- 7. Storage bucket for offer images (safe to re-run)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images', 'offer-images', true, 20971520,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Storage policies for offer-images bucket
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Anyone can view offer images'
  ) then
    create policy "Anyone can view offer images"
      on storage.objects for select
      using (bucket_id = 'offer-images');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and policyname = 'Sellers upload offer images'
  ) then
    create policy "Sellers upload offer images"
      on storage.objects for insert
      with check (bucket_id = 'offer-images' and auth.role() = 'authenticated');
  end if;
end $$;

-- 8. RLS policies for offers table (safe to skip if already exist)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'offers' and policyname = 'Buyers can see offers on their requests'
  ) then
    create policy "Buyers can see offers on their requests"
      on offers for select
      using (
        request_id in (
          select id from requests where buyer_id = auth.uid()
        )
        or seller_id = auth.uid()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'offers' and policyname = 'Sellers can insert offers'
  ) then
    create policy "Sellers can insert offers"
      on offers for insert
      with check (seller_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'offers' and policyname = 'Buyers can update offer status'
  ) then
    create policy "Buyers can update offer status"
      on offers for update
      using (
        request_id in (
          select id from requests where buyer_id = auth.uid()
        )
      );
  end if;
end $$;

-- 9. Enable realtime on offers (safe)
do $$ begin
  alter publication supabase_realtime add table offers;
exception when others then null;
end $$;

-- ============================================================
-- Done! All migrations applied.
-- ============================================================
