-- ============================================================
-- SWOOP FEED SCHEMA
-- Run this in Supabase SQL Editor → New Query
-- ============================================================

-- Posts (product listings shown in the feed)
create table if not exists posts (
  id            uuid default gen_random_uuid() primary key,
  seller_id     uuid references profiles(id) on delete cascade,
  title         text not null,
  description   text,
  price         numeric not null,
  orig_price    numeric,
  category      text,
  condition     text,
  brand         text,
  location      text,
  images        text[] default '{}',
  video_url     text,
  bg_color      text default '#0d0d0d',
  emoji         text default '📦',
  is_hot        boolean default false,
  is_negotiable boolean default false,
  delivery_available boolean default false,
  status        text default 'active' check (status in ('active','reserved','sold','draft')),
  likes_count   int default 0,
  comments_count int default 0,
  saves_count   int default 0,
  shares_count  int default 0,
  views_count   int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table posts enable row level security;
create policy "Anyone can view active posts"  on posts for select using (status != 'draft' or auth.uid() = seller_id);
create policy "Sellers manage own posts"      on posts for all using (auth.uid() = seller_id);

-- Likes
create table if not exists likes (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
alter table likes enable row level security;
create policy "Anyone can view likes"    on likes for select using (true);
create policy "Users manage own likes"   on likes for all using (auth.uid() = user_id);

-- Saves / Bookmarks
create table if not exists saves (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
alter table saves enable row level security;
create policy "Users see own saves"      on saves for select using (auth.uid() = user_id);
create policy "Users manage own saves"   on saves for all using (auth.uid() = user_id);

-- Post Comments
create table if not exists post_comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  message    text not null,
  created_at timestamptz default now()
);
alter table post_comments enable row level security;
create policy "Anyone can view comments"   on post_comments for select using (true);
create policy "Users post own comments"    on post_comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments"  on post_comments for delete using (auth.uid() = user_id);

-- Post Views (analytics)
create table if not exists post_views (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts(id) on delete cascade,
  user_id    uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table post_views enable row level security;
create policy "Anyone can insert views"   on post_views for insert with check (true);

-- Enable Realtime on comments (for live comment feeds)
alter publication supabase_realtime add table post_comments;

-- ── Atomic counter functions ──────────────────────────────────────────────────

create or replace function increment_likes(post_id uuid)
returns void language sql as $$
  update posts set likes_count = likes_count + 1 where id = post_id;
$$;

create or replace function decrement_likes(post_id uuid)
returns void language sql as $$
  update posts set likes_count = greatest(likes_count - 1, 0) where id = post_id;
$$;

create or replace function increment_saves(post_id uuid)
returns void language sql as $$
  update posts set saves_count = saves_count + 1 where id = post_id;
$$;

create or replace function decrement_saves(post_id uuid)
returns void language sql as $$
  update posts set saves_count = greatest(saves_count - 1, 0) where id = post_id;
$$;

create or replace function increment_comments(post_id uuid)
returns void language sql as $$
  update posts set comments_count = comments_count + 1 where id = post_id;
$$;

create or replace function increment_shares(post_id uuid)
returns void language sql as $$
  update posts set shares_count = shares_count + 1 where id = post_id;
$$;

create or replace function increment_views(post_id uuid)
returns void language sql as $$
  update posts set views_count = views_count + 1 where id = post_id;
$$;
