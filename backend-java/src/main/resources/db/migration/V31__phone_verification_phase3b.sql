ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS auth_phone_verification (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    phone_number VARCHAR(30) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL,
    channel VARCHAR(20) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_phone_verification_user_consumed
    ON auth_phone_verification(user_id, consumed_at);

CREATE INDEX IF NOT EXISTS idx_auth_phone_verification_expires
    ON auth_phone_verification(expires_at);
