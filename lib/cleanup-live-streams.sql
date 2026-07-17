-- ============================================================
-- CLEANUP: End all stuck live streams
-- Run this in Supabase SQL Editor → New Query
-- This ends ALL streams currently marked as 'live'
-- ============================================================

-- End all stuck live streams (marks them as 'ended')
update live_streams
set
  status    = 'ended',
  ended_at  = now()
where status = 'live';

-- Confirm how many were ended
select count(*) as streams_ended
from live_streams
where status = 'ended'
  and ended_at >= now() - interval '1 minute';

-- Also reset viewer counts to 0 on any remaining live streams
update live_streams
set viewer_count = 0
where viewer_count > 0 and status = 'ended';
