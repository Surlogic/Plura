-- Permite volver a registrar un email/proveedor despues de una baja soft-delete,
-- sin permitir duplicados entre cuentas activas.

ALTER TABLE app_user
    DROP CONSTRAINT IF EXISTS uq_app_user_email;

DROP INDEX IF EXISTS uq_app_user_email;
DROP INDEX IF EXISTS uq_app_user_email_active;

CREATE UNIQUE INDEX uq_app_user_email_active
    ON app_user (lower(email))
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_app_user_provider_provider_id;
DROP INDEX IF EXISTS uk_app_user_provider_provider_id_active;

CREATE UNIQUE INDEX uk_app_user_provider_provider_id_active
    ON app_user (provider, provider_id)
    WHERE provider IS NOT NULL
      AND provider_id IS NOT NULL
      AND deleted_at IS NULL;
