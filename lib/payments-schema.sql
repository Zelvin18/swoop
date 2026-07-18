-- ============================================================
-- SWOOP PAYMENTS SCHEMA — Phase 1
-- Reservation → Seller Accept → Buyer Pay → Escrow → Release
--
-- Run AFTER profile-schema.sql (which creates the base `orders`
-- and `transactions` tables). All statements idempotent.
-- ============================================================

-- ── 1. Extend `orders` with payment + fulfillment lifecycle ─────────────────
-- The existing `status` column is kept for backward-compat display, but the
-- pair (payment_status, fulfillment_status) becomes the source of truth.
alter table orders
  add column if not exists payment_status    text default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','refunded','failed')),
  add column if not exists fulfillment_status text default 'pending'
    check (fulfillment_status in ('requested','accepted','awaiting_payment','paid','shipped','delivered','completed','cancelled','declined')),
  add column if not exists delivery_fee      numeric default 0,
  add column if not exists buyer_lat         double precision,
  add column if not exists buyer_lng         double precision,
  add column if not exists distance_km       numeric,
  add column if not exists payment_method    text,    -- 'mtn' | 'airtel' | 'card'
  add column if not exists payment_ref       text unique,  -- our ref, e.g. swoop_<uuid>
  add column if not exists provider_txn_id   text,    -- gateway transaction id
  add column if not expires_at               timestamptz,  -- reservation expiry (~24h)
  add column if not accepted_at              timestamptz,
  add column if not paid_at                  timestamptz,
  add column if not delivered_at             timestamptz,
  add column if not released_at              timestamptz;

-- Keep orders.updated_at current (trigger fn already exists from posts-complete-schema-v2.sql)
drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- Realtime on orders (so chat action buttons sync live)
do $$ begin
  alter publication supabase_realtime add table orders;
exception when others then null;
end $$;

-- ── 2. Wallet ledger — append-only accounting source of truth ───────────────
create table if not exists wallet_ledger (
  id          uuid default gen_random_uuid() primary key,
  seller_id   uuid references profiles(id) on delete cascade,
  order_id    uuid references orders(id) on delete set null,
  type        text not null check (type in ('escrow_hold','sale_credit','refund_debit','payout_debit','adjustment')),
  amount      numeric not null,   -- positive = credit to seller, negative = debit
  reference   text,
  created_at  timestamptz default now()
);
create index if not exists wallet_ledger_seller_idx on wallet_ledger (seller_id, created_at desc);
alter table wallet_ledger enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='wallet_ledger' and policyname='Sellers see own ledger') then
    create policy "Sellers see own ledger"
      on wallet_ledger for select using (auth.uid() = seller_id);
  end if;
end $$;

-- ── 3. Payouts — seller withdrawals (phase 1 = request only) ────────────────
create table if not exists payouts (
  id          uuid default gen_random_uuid() primary key,
  seller_id   uuid references profiles(id) on delete cascade,
  amount      numeric not null,
  method      text,          -- 'mtn' | 'airtel' | 'bank'
  destination text,
  status      text default 'pending' check (status in ('pending','processing','paid','failed')),
  provider_ref text,
  created_at  timestamptz default now()
);
alter table payouts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='payouts' and policyname='Sellers see own payouts') then
    create policy "Sellers see own payouts"
      on payouts for select using (auth.uid() = seller_id);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='payouts' and policyname='Sellers create payout requests') then
    create policy "Sellers create payout requests"
      on payouts for insert with check (auth.uid() = seller_id);
  end if;
end $$;

-- ── 4. Payment events — webhook idempotency ─────────────────────────────────
create table if not exists payment_events (
  provider           text not null,
  provider_event_id  text not null,
  payload            jsonb,
  processed_at       timestamptz default now(),
  primary key (provider, provider_event_id)
);

-- ── 5. Profiles money columns ───────────────────────────────────────────────
alter table profiles
  add column if not exists wallet_balance   numeric default 0,
  add column if not exists pending_balance  numeric default 0;  -- held in escrow

-- ── 6. Wallet ledger RPCs (atomic, SECURITY DEFINER) ────────────────────────
-- Lock money in escrow when buyer pays (called after webhook verifies payment)
create or replace function hold_escrow(p_order uuid, p_amount numeric)
returns void language sql security definer as $$
  insert into wallet_ledger (seller_id, order_id, type, amount, reference)
    select seller_id, p_order, 'escrow_hold', p_amount, 'escrow_' || p_order::text
    from orders where id = p_order;
  update profiles
    set pending_balance = coalesce(pending_balance, 0) + p_amount
    where id = (select seller_id from orders where id = p_order);
$$;

-- Release escrow to seller wallet when order completes
create or replace function release_escrow(p_order uuid)
returns void language sql security definer as $$
  insert into wallet_ledger (seller_id, order_id, type, amount, reference)
    select seller_id, p_order, 'sale_credit',
           coalesce(amount,0) + coalesce(delivery_fee,0),
           'sale_' || p_order::text
    from orders where id = p_order;
  update profiles
    set pending_balance = greatest(
          coalesce(pending_balance,0) - (
            select coalesce(amount,0) + coalesce(delivery_fee,0)
            from orders where id = p_order
          ), 0),
        wallet_balance = coalesce(wallet_balance,0) + (
          select coalesce(amount,0) + coalesce(delivery_fee,0)
          from orders where id = p_order
        ),
        total_earned = coalesce(total_earned,0) + (
          select coalesce(amount,0) from orders where id = p_order
        ),
        sales_count = coalesce(sales_count,0) + 1
    where id = (select seller_id from orders where id = p_order);
$$;

-- Refund escrow back (for cancellation after payment, before shipment)
create or replace function refund_escrow(p_order uuid)
returns void language sql security definer as $$
  insert into wallet_ledger (seller_id, order_id, type, amount, reference)
    select seller_id, p_order, 'refund_debit',
           -(coalesce(amount,0) + coalesce(delivery_fee,0)),
           'refund_' || p_order::text
    from orders where id = p_order;
  update profiles
    set pending_balance = greatest(
          coalesce(pending_balance,0) - (
            select coalesce(amount,0) + coalesce(delivery_fee,0)
            from orders where id = p_order
          ), 0)
    where id = (select seller_id from orders where id = p_order);
$$;

-- ── 7. Verify a seller's wallet balance matches their ledger ────────────────
-- (bookkeeping aid; the ledger is always the source of truth)
create or replace function seller_wallet_balance(p_seller uuid)
returns table (available numeric, pending numeric, ledger_total numeric)
language sql security definer as $$
  select
    p.wallet_balance,
    p.pending_balance,
    coalesce((select sum(amount) from wallet_ledger where seller_id = p_seller), 0)
  from profiles p where p.id = p_seller;
$$;

-- ============================================================
-- Done. Tables created/extended: orders, wallet_ledger, payouts,
--   payment_events. RPCs: hold_escrow, release_escrow, refund_escrow,
--   seller_wallet_balance.
-- ============================================================
