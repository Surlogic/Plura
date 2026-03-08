ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) NOT NULL DEFAULT 'ON_SITE';

UPDATE professional_service
SET payment_type = 'ON_SITE'
WHERE payment_type IS NULL OR btrim(payment_type) = '';

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'America/Montevideo';

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMP;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_name_snapshot VARCHAR(120);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_price_snapshot NUMERIC(12,2);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_duration_snapshot VARCHAR(40);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_post_buffer_minutes_snapshot INTEGER NOT NULL DEFAULT 0;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_payment_type_snapshot VARCHAR(20) NOT NULL DEFAULT 'ON_SITE';

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS policy_snapshot_json TEXT;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE booking b
SET timezone = COALESCE(NULLIF(b.timezone, ''), 'America/Montevideo'),
    service_name_snapshot = COALESCE(b.service_name_snapshot, s.name),
    service_price_snapshot = COALESCE(
        b.service_price_snapshot,
        CASE
            WHEN s.price ~ '^[0-9]+(\\.[0-9]{1,2})?$' THEN s.price::numeric(12,2)
            ELSE NULL
        END
    ),
    service_duration_snapshot = COALESCE(b.service_duration_snapshot, s.duration),
    service_post_buffer_minutes_snapshot = COALESCE(b.service_post_buffer_minutes_snapshot, COALESCE(s.post_buffer_minutes, 0)),
    service_payment_type_snapshot = COALESCE(
        NULLIF(b.service_payment_type_snapshot, ''),
        NULLIF(s.payment_type, ''),
        'ON_SITE'
    )
FROM professional_service s
WHERE b.service_id = s.id;

ALTER TABLE booking
    ALTER COLUMN service_name_snapshot SET NOT NULL;

ALTER TABLE booking
    ALTER COLUMN service_duration_snapshot SET NOT NULL;

CREATE TABLE IF NOT EXISTS booking_event (
    id VARCHAR(36) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id),
    event_type VARCHAR(40) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id BIGINT,
    payload_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_event_booking_created_at
    ON booking_event(booking_id, created_at);

CREATE TABLE IF NOT EXISTS booking_policy (
    id VARCHAR(36) PRIMARY KEY,
    professional_id BIGINT NOT NULL UNIQUE REFERENCES professional_profile(id),
    allow_client_cancellation BOOLEAN NOT NULL DEFAULT TRUE,
    allow_client_reschedule BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_window_hours INTEGER,
    reschedule_window_hours INTEGER,
    max_client_reschedules INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
