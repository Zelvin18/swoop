-- ============================================================
-- CREATE STORAGE BUCKET FOR REQUEST IMAGES
-- Run in Supabase SQL Editor → New Query
-- ============================================================

-- Create the storage bucket for request images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('request-images', 'request-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Note: RLS policies for storage.objects need to be set up through Supabase Dashboard
-- Go to: Storage → request-images → Policies
-- Or run as a superuser if you have those permissions
