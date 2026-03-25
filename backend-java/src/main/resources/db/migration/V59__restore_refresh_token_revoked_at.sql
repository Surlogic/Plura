DO $$
DECLARE
    revoked_exists boolean;
    revoked_at_exists boolean;
    expires_at_exists boolean;
    revoked_type text;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_refresh_token'
          AND column_name = 'revoked'
    )
    INTO revoked_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_refresh_token'
          AND column_name = 'revoked_at'
    )
    INTO revoked_at_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_refresh_token'
          AND column_name = 'expires_at'
    )
    INTO expires_at_exists;

    IF revoked_exists THEN
        SELECT data_type
        INTO revoked_type
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'auth_refresh_token'
          AND column_name = 'revoked';

        IF revoked_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
            IF NOT revoked_at_exists THEN
                EXECUTE 'ALTER TABLE auth_refresh_token RENAME COLUMN revoked TO revoked_at';
                revoked_at_exists := true;
            END IF;

        ELSIF revoked_type = 'boolean' THEN
            IF NOT revoked_at_exists THEN
                EXECUTE 'ALTER TABLE auth_refresh_token ADD COLUMN revoked_at timestamp without time zone';
                revoked_at_exists := true;
            END IF;

            IF expires_at_exists THEN
                EXECUTE $sql$
                    UPDATE auth_refresh_token
                    SET revoked_at = COALESCE(revoked_at, expires_at, CURRENT_TIMESTAMP)
                    WHERE revoked = true
                      AND revoked_at IS NULL
                $sql$;
            ELSE
                EXECUTE $sql$
                    UPDATE auth_refresh_token
                    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
                    WHERE revoked = true
                      AND revoked_at IS NULL
                $sql$;
            END IF;
        END IF;
    END IF;

    IF revoked_at_exists THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_auth_refresh_token_user_revoked_at ON auth_refresh_token(user_id, revoked_at)';
    END IF;
END $$;