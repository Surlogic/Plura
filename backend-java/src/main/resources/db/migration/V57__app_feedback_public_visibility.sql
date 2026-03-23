ALTER TABLE app_feedback
ADD COLUMN IF NOT EXISTS public_visible BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_feedback
SET public_visible = TRUE
WHERE status = 'ACTIVE'
  AND text IS NOT NULL
  AND BTRIM(text) <> '';

CREATE INDEX IF NOT EXISTS idx_app_feedback_public
ON app_feedback (public_visible, created_at DESC);
