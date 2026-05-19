CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_client_phone_active
    ON app_user (phone_number)
    WHERE phone_number IS NOT NULL
      AND deleted_at IS NULL
      AND client_active IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS ux_professional_profile_phone_active
    ON professional_profile (whatsapp)
    WHERE whatsapp IS NOT NULL
      AND active IS TRUE;
