-- ============================================================
-- SWOOP PAYMENTS MESSAGES — message types for the order flow
--
-- Adds two new message types so the chat can render interactive
-- action cards:  reservation_request (Accept/Decline)  and
-- payment_request (Pay Now). Run AFTER fix-schema.sql +
-- inbox-schema.sql + payments-schema.sql.
-- ============================================================

-- Drop any existing message_type check constraint and replace with the full set.
-- (Postgres CHECK constraints aren't easily extended; drop + recreate is the
--  idempotent way. We name the constraint so we can target it.)
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'messages'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%message_type%'
  ) then
    alter table messages drop constraint messages_message_type_check;
  end if;
exception when others then null;
end $$;

-- Some older runs used an auto-generated name; drop that too.
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'messages'::regclass and contype = 'c'
  ) then
    alter table messages drop constraint messages_message_type_check1;
  end if;
exception when others then null;
end $$;

alter table messages
  drop constraint if exists messages_message_type_check,
  drop constraint if exists messages_message_type_check1;

alter table messages
  add constraint messages_message_type_check check (
    message_type in (
      'text','image','product_card','reservation','offer','system',
      'reservation_request','payment_request'   -- new
    )
  );

-- Done.
