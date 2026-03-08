ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS auth_email_verification (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL,
    max_attempts INTEGER NOT NULL,
    channel VARCHAR(20) NOT NULL,
    CONSTRAINT fk_auth_email_verification_user
        FOREIGN KEY (user_id) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_email_verification_user_consumed
    ON auth_email_verification(user_id, consumed_at);

CREATE INDEX IF NOT EXISTS idx_auth_email_verification_expires
    ON auth_email_verification(expires_at);
