ALTER TABLE booking_policy
    ADD COLUMN IF NOT EXISTS late_cancellation_refund_mode VARCHAR(20);

ALTER TABLE booking_policy
    ADD COLUMN IF NOT EXISTS late_cancellation_refund_value NUMERIC(5,2);

UPDATE booking_policy
SET late_cancellation_refund_mode = CASE
        WHEN retain_deposit_on_late_cancellation IS TRUE THEN 'NONE'
        ELSE 'FULL'
    END
WHERE late_cancellation_refund_mode IS NULL;

UPDATE booking_policy
SET late_cancellation_refund_value = CASE
        WHEN late_cancellation_refund_mode = 'NONE' THEN 0
        WHEN late_cancellation_refund_mode = 'FULL' THEN 100
        ELSE COALESCE(late_cancellation_refund_value, 100)
    END
WHERE late_cancellation_refund_value IS NULL;

ALTER TABLE booking_policy
    ALTER COLUMN late_cancellation_refund_mode SET NOT NULL;

ALTER TABLE booking_policy
    ALTER COLUMN late_cancellation_refund_value SET DEFAULT 100;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS start_date_time_utc TIMESTAMP;

UPDATE booking
SET start_date_time_utc = (
    (start_date_time AT TIME ZONE COALESCE(NULLIF(timezone, ''), 'America/Montevideo')) AT TIME ZONE 'UTC'
)
WHERE start_date_time_utc IS NULL
  AND start_date_time IS NOT NULL;

ALTER TABLE booking
    ALTER COLUMN start_date_time_utc SET NOT NULL;
