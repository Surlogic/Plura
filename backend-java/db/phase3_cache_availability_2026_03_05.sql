-- Phase 3 cache/performance foundation

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS has_availability_today boolean NOT NULL DEFAULT false;

-- Backfill inicial desde available_slot para el día actual.
UPDATE professional_profile profile
SET has_availability_today = EXISTS (
  SELECT 1
  FROM available_slot slot
  WHERE slot.professional_id = profile.id
    AND slot.status = 'AVAILABLE'
    AND slot.start_at >= date_trunc('day', now())
    AND slot.start_at < date_trunc('day', now()) + interval '1 day'
);

CREATE INDEX IF NOT EXISTS idx_professional_profile_has_availability_today
  ON professional_profile (has_availability_today);
