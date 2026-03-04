ALTER TABLE professional_service
  ADD COLUMN IF NOT EXISTS post_buffer_minutes integer;

UPDATE professional_service
SET post_buffer_minutes = 0
WHERE post_buffer_minutes IS NULL OR post_buffer_minutes < 0;

ALTER TABLE professional_service
  ALTER COLUMN post_buffer_minutes SET DEFAULT 0,
  ALTER COLUMN post_buffer_minutes SET NOT NULL;
