-- Source: backend-java/db/phase2_critical_indexes_2026_03_05.sql
-- Phase 2: critical indexes for booking/auth/search hardening.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

DO $plura_unaccent$
DECLARE
    unaccent_schema text;
BEGIN
    SELECT n.nspname
    INTO unaccent_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent'
    LIMIT 1;

    IF unaccent_schema IS NULL THEN
        RAISE EXCEPTION 'Extension unaccent is required';
    END IF;

    EXECUTE format($function$
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
        RETURNS text
        LANGUAGE sql
        IMMUTABLE
        PARALLEL SAFE
        SET search_path = pg_catalog, public, extensions
        AS $body$
          SELECT %1$I.unaccent(%2$L::regdictionary, COALESCE(value, ''));
        $body$;
    $function$, unaccent_schema, unaccent_schema || '.unaccent');
END;
$plura_unaccent$;

CREATE INDEX IF NOT EXISTS idx_booking_user_status_date
ON booking (user_id, status, start_date_time);

CREATE INDEX IF NOT EXISTS idx_booking_professional_date_status
ON booking (professional_id, start_date_time, status);

CREATE INDEX IF NOT EXISTS idx_service_name_trgm
ON professional_service
USING gin (immutable_unaccent(lower(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_refresh_token_expiry
ON auth_refresh_token (expiry_date);

CREATE INDEX IF NOT EXISTS idx_user_role
ON app_user (role);
