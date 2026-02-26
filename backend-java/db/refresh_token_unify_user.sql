-- Unifica auth_refresh_token para el modelo de usuario único (app_user).
-- Esquema objetivo:
-- id, user_id, token, expiry_date, revoked
BEGIN;

ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS user_type;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS replaced_by;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS user_agent;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS created_at;

DO $$
DECLARE
    user_id_data_type text;
BEGIN
    SELECT data_type
    INTO user_id_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_refresh_token'
      AND column_name = 'user_id';

    IF user_id_data_type IS DISTINCT FROM 'bigint' THEN
        -- Tokens legacy con UUID quedan inválidos para el modelo actual.
        DELETE FROM auth_refresh_token WHERE user_id !~ '^[0-9]+$';

        ALTER TABLE auth_refresh_token
            ALTER COLUMN user_id TYPE bigint
            USING user_id::bigint;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'token_hash'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN token_hash TO token;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN expires_at TO expiry_date;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'revoked_at'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN revoked_at TO revoked;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_token_hash ON auth_refresh_token(token);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON auth_refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON auth_refresh_token(expiry_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_auth_refresh_token_user'
    ) THEN
        ALTER TABLE auth_refresh_token
            ADD CONSTRAINT fk_auth_refresh_token_user
            FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
