CREATE TABLE IF NOT EXISTS booking_action_decision (
    id VARCHAR(36) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id),
    action_type VARCHAR(20) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id BIGINT,
    status_before VARCHAR(20) NOT NULL,
    status_after VARCHAR(20) NOT NULL,
    refund_preview_amount NUMERIC(12,2),
    retain_preview_amount NUMERIC(12,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'UYU',
    financial_outcome_code VARCHAR(40) NOT NULL DEFAULT 'NO_FINANCIAL_ACTION',
    reason_codes_json TEXT,
    message_code VARCHAR(120),
    message_params_json TEXT,
    plain_text_fallback TEXT,
    decision_snapshot_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_action_decision_booking_created_at
    ON booking_action_decision(booking_id, created_at);
