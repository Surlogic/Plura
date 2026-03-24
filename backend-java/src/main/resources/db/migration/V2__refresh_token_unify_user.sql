-- Unifica auth_refresh_token para el modelo de usuario único (app_user).
-- Debe degradar a no-op si la tabla legacy no existe.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
    ) THEN
        RETURN;
    END IF;

    ALTER TABLE auth_refresh_token DROP COLUMN IF EXISTS user_type;
    ALTER TABLE auth_refresh_token DROP COLUMN IF EXISTS replaced_by;
    ALTER TABLE auth_refresh_token DROP COLUMN IF EXISTS user_agent;
    ALTER TABLE auth_refresh_token DROP COLUMN IF EXISTS created_at;
END $$;

DO $$
DECLARE
    user_id_data_type text;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
    ) THEN
        RETURN;
    END IF;

    SELECT data_type
    INTO user_id_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_refresh_token'
      AND column_name = 'user_id';

    IF user_id_data_type IS NOT NULL
       AND user_id_data_type <> 'bigint' THEN
        DELETE FROM auth_refresh_token
        WHERE user_id IS NOT NULL
          AND user_id !~ '^[0-9]+$';

        ALTER TABLE auth_refresh_token
            ALTER COLUMN user_id TYPE bigint
            USING user_id::bigint;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
    ) THEN
        RETURN;
    END IF;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
    ) THEN
        RETURN;
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_token_hash ON auth_refresh_token(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON auth_refresh_token(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON auth_refresh_token(expiry_date);
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
    ) THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'app_user'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_auth_refresh_token_user'
    ) THEN
        ALTER TABLE auth_refresh_token
            ADD CONSTRAINT fk_auth_refresh_token_user
            FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    END IF;
END $$;