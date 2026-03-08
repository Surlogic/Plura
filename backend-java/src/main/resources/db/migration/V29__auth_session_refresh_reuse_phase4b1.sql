ALTER TABLE auth_session
    ADD COLUMN IF NOT EXISTS previous_refresh_token_hash VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS refresh_rotated_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS compromise_detected_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_auth_session_prev_refresh_hash
    ON auth_session(previous_refresh_token_hash);
