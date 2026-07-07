-- ============================================================
-- SWOOP SCHEMA FIXES
-- Run in Supabase SQL Editor → New Query
-- Fixes all known issues with posts, conversations, and messages
-- ============================================================

-- 1. Make price nullable on posts (social/service posts don't have prices)
alter table posts alter column price drop not null;

-- 2. Add post_type column if missing
alter table posts
  add column if not exists post_type text default 'product'
    check (post_type in ('product','social','service'));

-- 3. Add caption column for social posts
alter table posts
  add column if not exists caption text;

-- 4. Add service-specific columns
alter table posts
  add column if not exists service_category  text,
  add column if not exists service_rate      numeric,
  add column if not exists service_rate_type text default 'fixed',
  add column if not exists service_features  text[] default '{}',
  add column if not exists service_duration  text,
  add column if not exists service_badge     text;

-- 5. Fix conversations table — add missing columns
alter table conversations
  add column if not exists context_type text,
  add column if not exists context_id   uuid;

-- 6. Fix messages table — add message_type and metadata
alter table messages
  add column if not exists message_type text default 'text'
    check (message_type in ('text','image','reservation','system')),
  add column if not exists metadata jsonb;

-- 7. Update posts RLS to allow insert for authenticated users
-- (sellers can create posts)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'posts'
    and policyname = 'Authenticated users can insert posts'
  ) then
    create policy "Authenticated users can insert posts"
      on posts for insert
      with check (auth.uid() = seller_id);
  end if;
end $$;

-- 8. Ensure the feed-schema post insert policy exists
-- (the existing "Sellers manage own posts" covers insert, but let's make sure)
-- Also fix the select policy to show all non-draft posts publicly
do $$ begin
  -- Drop old select policy if it exists (re-create it correctly)
  if exists (
    select 1 from pg_policies
    where tablename = 'posts'
    and policyname = 'Anyone can view active posts'
  ) then
    drop policy "Anyone can view active posts" on posts;
  end if;
end $$;

create policy "Anyone can view active posts"
  on posts for select
  using (status != 'draft' or auth.uid() = seller_id);

-- 9. Add missing indexes for new columns
create index if not exists posts_post_type_idx on posts (post_type);
create index if not exists posts_seller_status_idx on posts (seller_id, status);

-- 10. Ensure messages RLS allows the full conversation participants to read
do $$ begin
  if exists (
    select 1 from pg_policies
    where tablename = 'messages'
    and policyname = 'Participants see messages'
  ) then
    drop policy "Participants see messages" on messages;
  end if;
end $$;

create policy "Participants see messages" on messages for select
  using (
    auth.uid() = sender_id or
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- 11. Ensure messages insert policy works correctly
do $$ begin
  if exists (
    select 1 from pg_policies
    where tablename = 'messages'
    and policyname = 'Sender can insert messages'
  ) then
    drop policy "Sender can insert messages" on messages;
  end if;
end $$;

create policy "Sender can insert messages" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Done!
-- After running this, social and service posts will work.
-- The 'price' column is now nullable, allowing non-product post types.
