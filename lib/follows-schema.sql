-- ============================================================
-- SWOOP FOLLOWS SCHEMA — safe to re-run
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Follows table (skips if already exists)
create table if not exists follows (
  id           uuid default gen_random_uuid() primary key,
  follower_id  uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(follower_id, following_id)
);
alter table follows enable row level security;

-- Policies (safe — skip if already exist)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='follows' and policyname='Anyone can view follows'
  ) then
    create policy "Anyone can view follows"
      on follows for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='follows' and policyname='Users manage own follows'
  ) then
    create policy "Users manage own follows"
      on follows for all using (auth.uid() = follower_id);
  end if;
end $$;

-- Indexes for fast lookups
create index if not exists follows_follower_idx  on follows (follower_id);
create index if not exists follows_following_idx on follows (following_id);

-- Auto-update follower/following counts via triggers
create or replace function handle_follow_insert()
returns trigger language plpgsql as $$
begin
  update profiles set following_count = following_count + 1 where id = new.follower_id;
  update profiles set followers_count = followers_count + 1 where id = new.following_id;
  return new;
end;
$$;

create or replace function handle_follow_delete()
returns trigger language plpgsql as $$
begin
  update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  return old;
end;
$$;

drop trigger if exists on_follow_insert on follows;
create trigger on_follow_insert
  after insert on follows
  for each row execute function handle_follow_insert();

drop trigger if exists on_follow_delete on follows;
create trigger on_follow_delete
  after delete on follows
  for each row execute function handle_follow_delete();
