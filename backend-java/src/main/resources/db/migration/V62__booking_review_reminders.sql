CREATE TABLE IF NOT EXISTS booking_review_reminder (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_booking_review_reminder_user_updated_at
    ON booking_review_reminder(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_review_reminder_last_reminded_at
    ON booking_review_reminder(last_reminded_at);
