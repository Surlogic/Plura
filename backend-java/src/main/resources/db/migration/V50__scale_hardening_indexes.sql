DROP INDEX IF EXISTS idx_email_dispatch_status_next_attempt;
DROP INDEX IF EXISTS idx_email_dispatch_recipient_created;
DROP INDEX IF EXISTS idx_provider_operation_lease;
DROP INDEX IF EXISTS idx_booking_prof_start;

CREATE INDEX IF NOT EXISTS idx_provider_operation_status_updated_at
    ON provider_operation (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_provider_operation_status_lease_until
    ON provider_operation (status, lease_until);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_external_reference
    ON payment_transaction (external_reference, created_at);
