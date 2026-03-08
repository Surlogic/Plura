ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12,2);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_deposit_amount_snapshot NUMERIC(12,2);

UPDATE booking b
SET service_deposit_amount_snapshot = s.deposit_amount
FROM professional_service s
WHERE b.service_id = s.id
  AND b.service_deposit_amount_snapshot IS NULL;

ALTER TABLE booking_policy
    ADD COLUMN IF NOT EXISTS retain_deposit_on_late_cancellation BOOLEAN NOT NULL DEFAULT FALSE;
