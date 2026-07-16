-- ============================================================
-- SWOOP LIVE SCHEMA
-- Run in Supabase SQL Editor → New Query
-- All statements idempotent (safe to run multiple times)
-- ============================================================

-- ── 1. live_streams ──────────────────────────────────────────
create table if not exists live_streams (
  id                uuid default gen_random_uuid() primary key,
  host_id           uuid references profiles(id) on delete cascade not null,
  title             text not null,
  category          text,
  type              text not null check (type in ('sell','social')),
  status            text not null default 'live' check (status in ('live','ended','scheduled')),
  viewer_count      int default 0,
  delivery_available boolean default false,
  scheduled_at      timestamptz,
  started_at        timestamptz default now(),
  ended_at          timestamptz,
  created_at        timestamptz default now()
);

alter table live_streams enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_streams' and policyname='Anyone can view live streams') then
    create policy "Anyone can view live streams"
      on live_streams for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_streams' and policyname='Hosts can manage their streams') then
    create policy "Hosts can manage their streams"
      on live_streams for all
      using (host_id = auth.uid())
      with check (host_id = auth.uid());
  end if;
end $$;

-- ── 2. live_products ─────────────────────────────────────────
create table if not exists live_products (
  id               uuid default gen_random_uuid() primary key,
  stream_id        uuid references live_streams(id) on delete cascade not null,
  name             text not null,
  price            numeric not null default 0,
  stock_count      int not null default 0,
  stock_remaining  int not null default 0,
  instant_reserve  boolean default true,
  delivery         boolean default false,
  image_url        text,
  position         int default 0,
  created_at       timestamptz default now()
);

alter table live_products enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_products' and policyname='Anyone can view live products') then
    create policy "Anyone can view live products"
      on live_products for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_products' and policyname='Hosts can manage live products') then
    create policy "Hosts can manage live products"
      on live_products for all
      using (stream_id in (select id from live_streams where host_id = auth.uid()))
      with check (stream_id in (select id from live_streams where host_id = auth.uid()));
  end if;
end $$;

-- ── 3. live_comments ─────────────────────────────────────────
create table if not exists live_comments (
  id         uuid default gen_random_uuid() primary key,
  stream_id  uuid references live_streams(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  message    text not null,
  created_at timestamptz default now()
);

alter table live_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_comments' and policyname='Anyone can view live comments') then
    create policy "Anyone can view live comments"
      on live_comments for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_comments' and policyname='Authenticated users can post comments') then
    create policy "Authenticated users can post comments"
      on live_comments for insert
      with check (user_id = auth.uid());
  end if;
end $$;

-- ── 4. live_reactions ────────────────────────────────────────
create table if not exists live_reactions (
  id         uuid default gen_random_uuid() primary key,
  stream_id  uuid references live_streams(id) on delete cascade not null,
  user_id    uuid references profiles(id) on delete cascade not null,
  type       text not null default 'heart' check (type in ('heart','fire','clap','star')),
  created_at timestamptz default now()
);

alter table live_reactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_reactions' and policyname='Anyone can view reactions') then
    create policy "Anyone can view reactions"
      on live_reactions for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_reactions' and policyname='Authenticated users can react') then
    create policy "Authenticated users can react"
      on live_reactions for insert
      with check (user_id = auth.uid());
  end if;
end $$;

-- ── 5. live_reservations ──────────────────────────────────────
create table if not exists live_reservations (
  id         uuid default gen_random_uuid() primary key,
  stream_id  uuid references live_streams(id) on delete cascade not null,
  product_id uuid references live_products(id) on delete cascade not null,
  buyer_id   uuid references profiles(id) on delete cascade not null,
  quantity   int not null default 1,
  status     text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz default now()
);

alter table live_reservations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_reservations' and policyname='Users can view their own reservations') then
    create policy "Users can view their own reservations"
      on live_reservations for select
      using (buyer_id = auth.uid() or stream_id in (select id from live_streams where host_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_reservations' and policyname='Authenticated users can reserve') then
    create policy "Authenticated users can reserve"
      on live_reservations for insert
      with check (buyer_id = auth.uid());
  end if;
end $$;

-- ── 6. live_notifications ─────────────────────────────────────
create table if not exists live_notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  actor_id   uuid references profiles(id) on delete set null,
  stream_id  uuid references live_streams(id) on delete cascade,
  type       text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

alter table live_notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_notifications' and policyname='Users can view their notifications') then
    create policy "Users can view their notifications"
      on live_notifications for select
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_notifications' and policyname='Anyone can insert notifications') then
    create policy "Anyone can insert notifications"
      on live_notifications for insert
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_notifications' and policyname='Users can update their notifications') then
    create policy "Users can update their notifications"
      on live_notifications for update
      using (user_id = auth.uid());
  end if;
end $$;

-- ── 7. Enable Realtime on all live tables ─────────────────────
do $$ begin
  alter publication supabase_realtime add table live_streams;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table live_comments;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table live_reactions;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table live_reservations;
exception when others then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table live_products;
exception when others then null;
end $$;

-- ── 8. RPCs for viewer count and stock ────────────────────────
create or replace function increment_viewer_count(stream_id uuid)
returns void language sql security definer as $$
  update live_streams set viewer_count = viewer_count + 1 where id = stream_id;
$$;

create or replace function decrement_viewer_count(stream_id uuid)
returns void language sql security definer as $$
  update live_streams
  set viewer_count = greatest(viewer_count - 1, 0)
  where id = stream_id;
$$;

create or replace function decrement_live_stock(product_id uuid)
returns void language sql security definer as $$
  update live_products
  set stock_remaining = greatest(stock_remaining - 1, 0)
  where id = product_id;
$$;

-- ── 9. RPC: get live reservation count for host ───────────────
create or replace function get_stream_reservation_count(stream_id uuid)
returns int language sql security definer as $$
  select count(*)::int from live_reservations where stream_id = $1 and status != 'cancelled';
$$;

-- ── Done ──────────────────────────────────────────────────────
-- Tables created: live_streams, live_products, live_comments,
--   live_reactions, live_reservations, live_notifications
-- RPCs: increment_viewer_count, decrement_viewer_count,
--   decrement_live_stock, get_stream_reservation_count
