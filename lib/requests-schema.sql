-- ============================================================
-- SWOOP REQUESTS SCHEMA
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Buyer requests
create table if not exists requests (
  id            uuid default gen_random_uuid() primary key,
  buyer_id      uuid references profiles(id) on delete cascade,
  title         text not null,
  description   text,
  category      text,
  budget_min    numeric,
  budget_max    numeric,
  color_pref    text,
  condition_pref text,
  location      text,
  lat           double precision,
  lng           double precision,
  radius_km     int default 20,
  images        text[] default '{}',
  visibility    text default 'everyone' check (visibility in ('everyone','following')),
  status        text default 'open' check (status in ('open','fulfilled','expired')),
  offers_count  int default 0,
  views_count   int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table requests enable row level security;
create policy "Anyone can view open requests"   on requests for select using (status = 'open' or auth.uid() = buyer_id);
create policy "Buyers manage own requests"      on requests for all    using (auth.uid() = buyer_id);

-- Offers from sellers on requests
create table if not exists offers (
  id           uuid default gen_random_uuid() primary key,
  request_id   uuid references requests(id) on delete cascade,
  seller_id    uuid references profiles(id) on delete cascade,
  message      text not null,
  price        numeric,
  images       text[] default '{}',
  status       text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at   timestamptz default now(),
  unique(request_id, seller_id)  -- one offer per seller per request
);
alter table offers enable row level security;
create policy "Buyer sees offers on own requests" on offers for select
  using (auth.uid() = (select buyer_id from requests where id = request_id));
create policy "Seller sees own offers"            on offers for select using (auth.uid() = seller_id);
create policy "Sellers create offers"             on offers for insert with check (auth.uid() = seller_id);
create policy "Offer parties can update"          on offers for update using (
  auth.uid() = seller_id or
  auth.uid() = (select buyer_id from requests where id = request_id)
);

-- Enable Realtime
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table offers;

-- Atomic counter functions
create or replace function increment_offers_count(req_id uuid)
returns void language sql as $$
  update requests set offers_count = offers_count + 1 where id = req_id;
$$;

create or replace function increment_request_views(req_id uuid)
returns void language sql as $$
  update requests set views_count = views_count + 1 where id = req_id;
$$;
