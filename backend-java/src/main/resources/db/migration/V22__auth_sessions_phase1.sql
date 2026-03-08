CREATE TABLE IF NOT EXISTS auth_session (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_type VARCHAR(20) NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    device_label VARCHAR(120),
    user_agent VARCHAR(500),
    ip_address VARCHAR(64),
    created_at TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revoke_reason VARCHAR(40),
    replaced_by_session_id VARCHAR(36),
    CONSTRAINT fk_auth_session_user
        FOREIGN KEY (user_id) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user
    ON auth_session(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_session_expires
    ON auth_session(expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_created
    ON auth_session(user_id, created_at DESC);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(64);
