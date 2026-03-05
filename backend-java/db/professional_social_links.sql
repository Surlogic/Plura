BEGIN;

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS instagram varchar(255),
  ADD COLUMN IF NOT EXISTS facebook varchar(255),
  ADD COLUMN IF NOT EXISTS tiktok varchar(255),
  ADD COLUMN IF NOT EXISTS website varchar(255),
  ADD COLUMN IF NOT EXISTS whatsapp varchar(255);

COMMIT;
