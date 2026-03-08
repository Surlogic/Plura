CREATE TABLE IF NOT EXISTS auth_password_reset (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    requested_ip VARCHAR(64),
    request_user_agent VARCHAR(500),
    CONSTRAINT fk_auth_password_reset_user
        FOREIGN KEY (user_id) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_password_reset_user_consumed
    ON auth_password_reset(user_id, consumed_at);

CREATE INDEX IF NOT EXISTS idx_auth_password_reset_expires
    ON auth_password_reset(expires_at);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
