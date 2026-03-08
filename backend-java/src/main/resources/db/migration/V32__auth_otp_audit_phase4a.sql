CREATE TABLE IF NOT EXISTS auth_otp_challenge (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    session_id VARCHAR(36) NULL,
    purpose VARCHAR(40) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenge_user_purpose_consumed
    ON auth_otp_challenge(user_id, purpose, consumed_at);

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenge_expires
    ON auth_otp_challenge(expires_at);

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NULL,
    session_id VARCHAR(36) NULL,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    metadata_json TEXT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_created
    ON auth_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_created
    ON auth_audit_log(event_type, created_at DESC);
