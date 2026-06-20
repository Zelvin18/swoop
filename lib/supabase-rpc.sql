-- Run these in Supabase SQL Editor → New Query

-- Increment viewer count safely
create or replace function increment_viewer_count(stream_id uuid)
returns void language sql as $$
  update live_streams set viewer_count = viewer_count + 1 where id = stream_id;
$$;

-- Decrement viewer count safely (floor at 0)
create or replace function decrement_viewer_count(stream_id uuid)
returns void language sql as $$
  update live_streams
  set viewer_count = greatest(viewer_count - 1, 0)
  where id = stream_id;
$$;

-- Decrement product stock safely (floor at 0)
create or replace function decrement_live_stock(product_id uuid)
returns void language sql as $$
  update live_products
  set stock_remaining = greatest(stock_remaining - 1, 0)
  where id = product_id;
$$;
