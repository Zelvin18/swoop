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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload request images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow public read access to request images
CREATE POLICY "Public can view request images"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-images');

-- Policy: Allow users to delete their own images
CREATE POLICY "Users can delete own request images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'request-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Helper function to extract folder name from path
CREATE OR REPLACE FUNCTION storage.foldername(text)
RETURNS text[] AS $$
SELECT string_to_array(regexp_replace($1, '^[^/]+/', ''), '/')
$$ LANGUAGE sql STABLE;
