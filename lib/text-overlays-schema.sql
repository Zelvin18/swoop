-- Text overlays on posts (rendered on videos; baked into exported images)
alter table posts
  add column if not exists text_overlays jsonb default '[]';
