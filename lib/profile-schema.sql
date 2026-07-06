-- ============================================================
-- SWOOP PROFILE SCHEMA
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Update profiles table with all fields needed
alter table profiles
  add column if not exists bio              text,
  add column if not exists website_url      text,
  add column if not exists followers_count  int default 0,
  add column if not exists following_count  int default 0,
  add column if not exists posts_count      int default 0,
  add column if not exists sales_count      int default 0,
  add column if not exists total_earned     numeric default 0,
  add column if not exists response_rate    int default 0,
  add column if not exists avg_rating       numeric(3,2) default 0,
  add column if not exists review_count     int default 0,
  add column if not exists is_seller        boolean default false,
  add column if not exists joined_at        timestamptz default now(),
  add column if not exists cover_url        text,
  add column if not exists badge            text,   -- e.g. 'Top Seller', 'New', 'Verified Pro'
  add column if not exists account_type     text default 'personal'
    check (account_type in ('personal','business'));

-- Reviews
create table if not exists reviews (
  id           uuid default gen_random_uuid() primary key,
  reviewer_id  uuid references profiles(id) on delete cascade,
  reviewed_id  uuid references profiles(id) on delete cascade,
  order_id     uuid,
  rating       int check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz default now(),
  unique(reviewer_id, order_id)
);
alter table reviews enable row level security;
create policy "Anyone can view reviews" on reviews for select using (true);
create policy "Users write own reviews" on reviews for insert with check (auth.uid() = reviewer_id);

-- Orders (product purchases)
create table if not exists orders (
  id            uuid default gen_random_uuid() primary key,
  post_id       uuid references posts(id) on delete set null,
  buyer_id      uuid references profiles(id) on delete cascade,
  seller_id     uuid references profiles(id) on delete cascade,
  quantity      int default 1,
  amount        numeric not null,
  status        text default 'pending'
    check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  delivery_type text default 'pickup' check (delivery_type in ('pickup','delivery')),
  delivery_address text,
  rider_id      uuid references profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table orders enable row level security;
create policy "Parties see own orders" on orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers create orders" on orders for insert
  with check (auth.uid() = buyer_id);
create policy "Parties update orders" on orders for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Wallet / transactions
create table if not exists transactions (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade,
  type           text check (type in ('sale','purchase','withdrawal','refund','bonus')),
  amount         numeric not null,
  fee            numeric default 0,
  net_amount     numeric,
  status         text default 'completed' check (status in ('pending','completed','failed')),
  reference      text,
  description    text,
  order_id       uuid references orders(id) on delete set null,
  created_at     timestamptz default now()
);
alter table transactions enable row level security;
create policy "Users see own transactions" on transactions for select using (auth.uid() = user_id);

-- User settings
create table if not exists user_settings (
  id                   uuid references profiles(id) on delete cascade primary key,
  notifications_likes  boolean default true,
  notifications_comments boolean default true,
  notifications_orders boolean default true,
  notifications_live   boolean default true,
  notifications_messages boolean default true,
  privacy_profile      text default 'public' check (privacy_profile in ('public','followers','private')),
  privacy_orders       text default 'private',
  show_online_status   boolean default true,
  dark_mode            boolean default true,
  language             text default 'en',
  updated_at           timestamptz default now()
);
alter table user_settings enable row level security;
create policy "Users manage own settings" on user_settings for all using (auth.uid() = id);

-- Saved posts (already exists via saves table)
-- Blocked users
create table if not exists blocks (
  id          uuid default gen_random_uuid() primary key,
  blocker_id  uuid references profiles(id) on delete cascade,
  blocked_id  uuid references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(blocker_id, blocked_id)
);
alter table blocks enable row level security;
create policy "Users manage own blocks" on blocks for all using (auth.uid() = blocker_id);

-- Realtime
alter publication supabase_realtime add table orders;

-- Counter functions
create or replace function increment_followers(profile_id uuid)
returns void language sql as $$
  update profiles set followers_count = followers_count + 1 where id = profile_id;
$$;
create or replace function decrement_followers(profile_id uuid)
returns void language sql as $$
  update profiles set followers_count = greatest(followers_count - 1, 0) where id = profile_id;
$$;
create or replace function increment_following(profile_id uuid)
returns void language sql as $$
  update profiles set following_count = following_count + 1 where id = profile_id;
$$;
create or replace function decrement_following(profile_id uuid)
returns void language sql as $$
  update profiles set following_count = greatest(following_count - 1, 0) where id = profile_id;
$$;
create or replace function increment_posts_count(profile_id uuid)
returns void language sql as $$
  update profiles set posts_count = posts_count + 1 where id = profile_id;
$$;
