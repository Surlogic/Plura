ALTER TABLE notification_event
    ADD COLUMN IF NOT EXISTS booking_reference_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_event_booking_ref
    ON notification_event (recipient_type, recipient_id, booking_reference_id, occurred_at);
