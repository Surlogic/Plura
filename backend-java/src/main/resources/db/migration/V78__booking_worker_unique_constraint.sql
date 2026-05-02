-- Replace the strict (professional_id, start_date_time) booking constraint with a
-- per-worker uniqueness so multiple workers in the same local can take bookings
-- at the same start time.

ALTER TABLE booking
    DROP CONSTRAINT IF EXISTS uq_professional_start;

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_worker_active_start
    ON booking(worker_id, start_date_time)
    WHERE worker_id IS NOT NULL
      AND status <> 'CANCELLED';

-- Available_slot already gained a (worker_id, start_at) partial unique index in V77.
-- The legacy (professional_id, start_at) constraint is no longer accurate once
-- multiple workers exist; drop it so concurrent worker slots can be persisted.
ALTER TABLE available_slot
    DROP CONSTRAINT IF EXISTS uq_available_slot_professional_start;
