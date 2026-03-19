CREATE TABLE IF NOT EXISTS professional_payment_provider_connection (
    id VARCHAR(36) PRIMARY KEY,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id),
    provider VARCHAR(30) NOT NULL,
    status VARCHAR(40) NOT NULL,
    provider_account_id VARCHAR(128),
    provider_user_id VARCHAR(128),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP,
    scope VARCHAR(255),
    connected_at TIMESTAMP,
    disconnected_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    last_error VARCHAR(1000),
    metadata_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prof_payment_provider_connection_professional_provider
        UNIQUE (professional_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_prof_payment_provider_connection_provider_user
    ON professional_payment_provider_connection(provider, provider_user_id);

CREATE INDEX IF NOT EXISTS idx_prof_payment_provider_connection_status
    ON professional_payment_provider_connection(status, updated_at);
