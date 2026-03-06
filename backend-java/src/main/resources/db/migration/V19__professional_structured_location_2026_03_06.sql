-- Structured location fields for professionals (country/city/full address).
-- Safe to run multiple times.

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS country varchar(80),
  ADD COLUMN IF NOT EXISTS city varchar(120),
  ADD COLUMN IF NOT EXISTS full_address varchar(255);

-- Backfill minimal compatibility from existing location text when possible.
UPDATE professional_profile
SET full_address = NULLIF(BTRIM(location), '')
WHERE full_address IS NULL
  AND location IS NOT NULL
  AND BTRIM(location) <> '';
