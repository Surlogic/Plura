-- Phase 2: critical indexes for booking/auth/search hardening.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent('unaccent', COALESCE(value, ''));
$$;

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
