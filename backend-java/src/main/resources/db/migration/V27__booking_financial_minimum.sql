CREATE TABLE IF NOT EXISTS booking_financial_summary (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES booking(id),
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_retained NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_to_refund NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_refunded NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'UYU',
    financial_status VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUIRED',
    last_decision_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

ALTER TABLE booking_financial_summary
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_retained NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_booking_financial_summary_status
    ON booking_financial_summary(financial_status);

CREATE TABLE IF NOT EXISTS booking_refund_record (
    id VARCHAR(36) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id),
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id BIGINT,
    requested_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL,
    reason_code VARCHAR(40) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'UYU',
    provider_reference VARCHAR(200),
    related_decision_id VARCHAR(36),
    metadata_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_refund_record_booking_created_at
    ON booking_refund_record(booking_id, created_at);

CREATE TABLE IF NOT EXISTS booking_command_idempotency (
    id BIGSERIAL PRIMARY KEY,
    command_type VARCHAR(20) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_user_id BIGINT NOT NULL,
    booking_id BIGINT NOT NULL REFERENCES booking(id),
    idempotency_key VARCHAR(120) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_json TEXT,
    error_message VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_booking_command_idempotency_actor_key UNIQUE (
        actor_type,
        actor_user_id,
        command_type,
        idempotency_key
    )
);

CREATE INDEX IF NOT EXISTS idx_booking_command_idempotency_booking
    ON booking_command_idempotency(booking_id, created_at);

INSERT INTO booking_financial_summary (
    booking_id,
    amount_paid,
    amount_retained,
    amount_to_refund,
    amount_refunded,
    currency,
    financial_status,
    created_at,
    updated_at,
    version
)
SELECT
    b.id,
    CASE
        WHEN b.service_payment_type_snapshot = 'DEPOSIT' THEN COALESCE(b.service_deposit_amount_snapshot, 0)
        WHEN b.service_payment_type_snapshot = 'FULL_PREPAY' THEN COALESCE(b.service_price_snapshot, 0)
        ELSE 0
    END AS amount_paid,
    0,
    0,
    0,
    'UYU',
    CASE
        WHEN b.service_payment_type_snapshot IN ('DEPOSIT', 'FULL_PREPAY') THEN 'PAID'
        ELSE 'NOT_REQUIRED'
    END AS financial_status,
    COALESCE(b.created_at, NOW()),
    COALESCE(b.created_at, NOW()),
    0
FROM booking b
WHERE NOT EXISTS (
    SELECT 1
    FROM booking_financial_summary bfs
    WHERE bfs.booking_id = b.id
);
