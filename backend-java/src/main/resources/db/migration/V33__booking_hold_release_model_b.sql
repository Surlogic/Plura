ALTER TABLE booking_financial_summary
    ADD COLUMN IF NOT EXISTS amount_charged NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE booking_financial_summary
    ADD COLUMN IF NOT EXISTS amount_held NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE booking_financial_summary
    ADD COLUMN IF NOT EXISTS amount_to_release NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE booking_financial_summary
    ADD COLUMN IF NOT EXISTS amount_released NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE booking_financial_summary
SET amount_charged = COALESCE(amount_paid, 0),
    amount_held = GREATEST(COALESCE(amount_paid, 0) - COALESCE(amount_refunded, 0), 0),
    amount_to_release = COALESCE(amount_to_release, 0),
    amount_released = COALESCE(amount_released, 0)
WHERE amount_charged = 0
  AND amount_held = 0
  AND amount_to_release = 0
  AND amount_released = 0;

UPDATE booking_financial_summary
SET financial_status = CASE financial_status
    WHEN 'PAID' THEN 'HELD'
    WHEN 'RETAINED' THEN 'HELD'
    ELSE financial_status
END
WHERE financial_status IN ('PAID', 'RETAINED');

CREATE TABLE IF NOT EXISTS booking_payout_record (
    id VARCHAR(36) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id),
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id),
    target_amount NUMERIC(12,2) NOT NULL,
    released_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL,
    reason_code VARCHAR(40) NOT NULL,
    provider VARCHAR(30) NULL,
    provider_reference VARCHAR(200) NULL,
    payload_json TEXT NULL,
    related_decision_id VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    executed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_payout_record_booking
    ON booking_payout_record(booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_payout_record_professional
    ON booking_payout_record(professional_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_payout_record_related_decision
    ON booking_payout_record(related_decision_id)
    WHERE related_decision_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_payout_record_provider_reference
    ON booking_payout_record(provider_reference)
    WHERE provider_reference IS NOT NULL;

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS payout_record_id VARCHAR(36) REFERENCES booking_payout_record(id);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_payout_record
    ON payment_transaction(payout_record_id, created_at);

ALTER TABLE payment_event
    ADD COLUMN IF NOT EXISTS payout_record_id VARCHAR(36) REFERENCES booking_payout_record(id);

CREATE INDEX IF NOT EXISTS idx_payment_event_payout_record
    ON payment_event(payout_record_id, created_at);
