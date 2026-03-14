CREATE TABLE IF NOT EXISTS provider_operation (
    id VARCHAR(36) PRIMARY KEY,
    operation_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    booking_id BIGINT NULL,
    payment_transaction_id VARCHAR(36) NULL,
    refund_record_id VARCHAR(36) NULL,
    payout_record_id VARCHAR(36) NULL,
    external_reference VARCHAR(200) NOT NULL,
    provider_reference VARCHAR(200) NULL,
    request_payload_json TEXT NULL,
    response_payload_json TEXT NULL,
    last_error VARCHAR(1000) NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    next_attempt_at TIMESTAMP NULL,
    locked_by VARCHAR(120) NULL,
    locked_at TIMESTAMP NULL,
    lease_until TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_provider_operation_type_reference UNIQUE (operation_type, external_reference)
);

CREATE INDEX IF NOT EXISTS idx_provider_operation_status_next_attempt
    ON provider_operation (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_provider_operation_booking
    ON provider_operation (booking_id);

CREATE INDEX IF NOT EXISTS idx_provider_operation_transaction
    ON provider_operation (payment_transaction_id);

CREATE INDEX IF NOT EXISTS idx_provider_operation_lease
    ON provider_operation (lease_until);
