-- Source: backend-java/db/slot_duration_minutes.sql
ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS slot_duration_minutes integer;

UPDATE professional_profile
SET slot_duration_minutes = 15
WHERE slot_duration_minutes IS NULL;

ALTER TABLE professional_profile
  ALTER COLUMN slot_duration_minutes SET DEFAULT 15,
  ALTER COLUMN slot_duration_minutes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_prof_slot_duration_minutes'
  ) THEN
    ALTER TABLE professional_profile
      ADD CONSTRAINT chk_prof_slot_duration_minutes
      CHECK (slot_duration_minutes IN (10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60));
  END IF;
END $$;
