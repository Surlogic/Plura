CREATE TABLE IF NOT EXISTS client_favorite_professional (
    id BIGSERIAL PRIMARY KEY,
    client_user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_client_favorite_professional UNIQUE (client_user_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_client_favorite_professional_client_created
    ON client_favorite_professional (client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_favorite_professional_professional
    ON client_favorite_professional (professional_id);
