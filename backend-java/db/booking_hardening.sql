-- Hardening de reservas:
-- 1) Evita doble booking por profesional+fecha_hora (concurrencia).
-- 2) Agrega flags de actividad para profesional/servicio.
BEGIN;

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE professional_profile
SET active = true
WHERE active IS NULL;

UPDATE professional_service
SET active = true
WHERE active IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_start
    ON booking (professional_id, start_date_time);

DROP INDEX IF EXISTS idx_booking_professional_start;

COMMIT;
