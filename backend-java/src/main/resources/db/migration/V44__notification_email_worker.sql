ALTER TABLE email_dispatch
    ADD COLUMN IF NOT EXISTS locked_by VARCHAR(120) NULL;

ALTER TABLE email_dispatch
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL;

ALTER TABLE email_dispatch
    ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_email_dispatch_status_due
    ON email_dispatch (status, next_attempt_at, lease_until);
