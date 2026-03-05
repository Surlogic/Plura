-- OAuth columns for app_user (Google/Apple login support).
-- Safe to run multiple times.

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS provider varchar(20);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS provider_id varchar(255);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS avatar varchar(500);

CREATE INDEX IF NOT EXISTS idx_app_user_provider
    ON app_user (provider);

CREATE INDEX IF NOT EXISTS idx_app_user_provider_id
    ON app_user (provider_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_app_user_provider_provider_id
    ON app_user (provider, provider_id)
    WHERE provider IS NOT NULL AND provider_id IS NOT NULL;
