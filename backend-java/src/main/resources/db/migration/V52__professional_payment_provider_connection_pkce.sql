ALTER TABLE professional_payment_provider_connection
    ADD COLUMN IF NOT EXISTS pending_oauth_state VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS pending_oauth_state_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS pending_oauth_code_verifier_encrypted TEXT;
