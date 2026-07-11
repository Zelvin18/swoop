-- Add music tracking and album art columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS music_id TEXT,
ADD COLUMN IF NOT EXISTS music_title TEXT,
ADD COLUMN IF NOT EXISTS music_artist TEXT,
ADD COLUMN IF NOT EXISTS music_album_art TEXT,
ADD COLUMN IF NOT EXISTS music_file_url TEXT;

-- Create music table for tracking sounds and their usage
CREATE TABLE IF NOT EXISTS music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  album_art TEXT,
  file_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for music lookups
CREATE INDEX IF NOT EXISTS idx_posts_music_id ON posts(music_id);
CREATE INDEX IF NOT EXISTS idx_music_title ON music(title);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to music table
CREATE TRIGGER update_music_updated_at
  BEFORE UPDATE ON music
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the music tracking
COMMENT ON COLUMN posts.music_id IS 'Foreign key reference to music table';
COMMENT ON COLUMN posts.music_title IS 'Cached music title for display';
COMMENT ON COLUMN posts.music_artist IS 'Cached music artist for display';
COMMENT ON COLUMN posts.music_album_art IS 'URL to album art image';
COMMENT ON COLUMN posts.music_file_url IS 'URL to audio file';
