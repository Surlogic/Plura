ALTER TABLE booking_policy
    ALTER COLUMN max_client_reschedules SET DEFAULT 1;

UPDATE booking_policy
SET max_client_reschedules = 1
WHERE allow_client_reschedule = TRUE
  AND (max_client_reschedules IS NULL OR max_client_reschedules = 0);
