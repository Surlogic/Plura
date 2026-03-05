BEGIN;

CREATE TABLE IF NOT EXISTS business_photo (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  url varchar(500) NOT NULL,
  type varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chk_business_photo_type CHECK (type IN ('LOCAL', 'SERVICE', 'WORK'))
);

CREATE INDEX IF NOT EXISTS idx_business_photo_professional_type_created
  ON business_photo (professional_id, type, created_at);

COMMIT;
