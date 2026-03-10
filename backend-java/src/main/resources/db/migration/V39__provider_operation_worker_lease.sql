ALTER TABLE provider_operation
    ADD COLUMN IF NOT EXISTS locked_by VARCHAR(120) NULL;

ALTER TABLE provider_operation
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL;

ALTER TABLE provider_operation
    ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_provider_operation_lease
    ON provider_operation (lease_until);
