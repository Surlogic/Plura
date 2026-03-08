ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'UYU';

UPDATE professional_service
SET currency = 'UYU'
WHERE currency IS NULL OR btrim(currency) = '';

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_currency_snapshot VARCHAR(10) NOT NULL DEFAULT 'UYU';

UPDATE booking b
SET service_currency_snapshot = COALESCE(NULLIF(b.service_currency_snapshot, ''), NULLIF(s.currency, ''), 'UYU')
FROM professional_service s
WHERE b.service_id = s.id;

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES booking(id);

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS refund_record_id VARCHAR(36) REFERENCES booking_refund_record(id);

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30) NOT NULL DEFAULT 'SUBSCRIPTION_CHARGE';

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS provider_status VARCHAR(80);

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS external_reference VARCHAR(200);

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS payload_json TEXT;

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

ALTER TABLE payment_transaction
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payment_transaction_booking
    ON payment_transaction(booking_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_refund_record
    ON payment_transaction(refund_record_id, created_at);

ALTER TABLE payment_event
    ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES booking(id);

ALTER TABLE payment_event
    ADD COLUMN IF NOT EXISTS refund_record_id VARCHAR(36) REFERENCES booking_refund_record(id);

ALTER TABLE payment_event
    ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(36) REFERENCES payment_transaction(id);

CREATE INDEX IF NOT EXISTS idx_payment_event_booking
    ON payment_event(booking_id, created_at);

ALTER TABLE booking_financial_summary
    ALTER COLUMN amount_paid SET DEFAULT 0;

UPDATE booking_financial_summary bfs
SET amount_paid = 0,
    currency = COALESCE(NULLIF(b.service_currency_snapshot, ''), bfs.currency, 'UYU'),
    financial_status = CASE
        WHEN b.service_payment_type_snapshot IN ('DEPOSIT', 'FULL_PREPAY') THEN 'PAYMENT_PENDING'
        ELSE 'NOT_REQUIRED'
    END,
    updated_at = NOW()
FROM booking b
WHERE bfs.booking_id = b.id
  AND bfs.last_decision_id IS NULL;
