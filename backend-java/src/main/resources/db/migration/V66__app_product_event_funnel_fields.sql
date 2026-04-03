ALTER TABLE app_product_event
    ADD COLUMN IF NOT EXISTS booking_id BIGINT,
    ADD COLUMN IF NOT EXISTS user_id BIGINT,
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS step_name VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_app_product_event_session_occurred
    ON app_product_event (session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_booking_occurred
    ON app_product_event (booking_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_user_occurred
    ON app_product_event (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_step_occurred
    ON app_product_event (step_name, occurred_at DESC);
