-- ============================================================
-- SWOOP POSTS — COMPLETE SCHEMA UPDATE
-- Run in Supabase SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- 1. Add missing columns to posts table
alter table posts
  add column if not exists is_hot              boolean default false,
  add column if not exists tags                text[]  default '{}',
  add column if not exists thumbnail_url       text,
  add column if not exists lat                 double precision,
  add column if not exists lng                 double precision;

-- 2. Auto-update updated_at on every row change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

-- 3. Performance indexes
create index if not exists posts_seller_id_idx  on posts (seller_id);
create index if not exists posts_category_idx   on posts (category) where status = 'active';
create index if not exists posts_status_idx     on posts (status);
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_lat_lng_idx    on posts (lat, lng) where lat is not null;

-- 4. post_views: add viewer_fingerprint for anonymous tracking
alter table post_views
  add column if not exists viewer_fingerprint text;

-- 5. Add follows table if not exists (needed for feed personalisation)
create table if not exists follows (
  id           uuid default gen_random_uuid() primary key,
  follower_id  uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(follower_id, following_id)
);
alter table follows enable row level security;
create policy "Anyone can see follows"   on follows for select using (true);
create policy "Users manage own follows" on follows for all using (auth.uid() = follower_id);

-- 6. Conversations table (needed for Chat with Seller)
create table if not exists conversations (
  id           uuid default gen_random_uuid() primary key,
  post_id      uuid references posts(id) on delete set null,
  buyer_id     uuid references profiles(id) on delete cascade,
  seller_id    uuid references profiles(id) on delete cascade,
  last_message text,
  last_at      timestamptz default now(),
  unread_buyer  int default 0,
  unread_seller int default 0,
  created_at   timestamptz default now(),
  unique(post_id, buyer_id, seller_id)
);
alter table conversations enable row level security;
create policy "Participants see own conversations" on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Participants manage conversations" on conversations for all
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 7. Messages table
create table if not exists messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id) on delete cascade,
  content         text not null,
  image_url       text,
  read_at         timestamptz,
  created_at      timestamptz default now()
);
alter table messages enable row level security;
create policy "Participants see messages" on messages for select
  using (
    auth.uid() = sender_id or
    auth.uid() = (select buyer_id  from conversations where id = conversation_id) or
    auth.uid() = (select seller_id from conversations where id = conversation_id)
  );
create policy "Sender can insert messages" on messages for insert
  with check (auth.uid() = sender_id);

-- Enable realtime on messages and conversations
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ============================================================
-- STORAGE SETUP (run once, sets up the media bucket)
-- ============================================================

-- Create storage bucket for post media
-- NOTE: Also do this in Supabase Dashboard → Storage → New bucket
-- Name: post-media
-- Public: YES
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/quicktime
-- Max file size: 50MB

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  52428800,  -- 50MB
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can read post media"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Authenticated users can upload post media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.role() = 'authenticated');

create policy "Users can update own post media"
  on storage.objects for update
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own post media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
