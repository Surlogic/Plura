-- Source: backend-java/db/phase5_search_hardening_2026_03_05.sql
-- Phase 5: search hardening indexes for SQL fallback.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, COALESCE(value, ''));
$$;

CREATE INDEX IF NOT EXISTS idx_professional_profile_rubro_trgm
ON professional_profile
USING gin (immutable_unaccent(lower(COALESCE(rubro, ''))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_professional_profile_geom_gist
ON professional_profile
USING gist (geom);

CREATE INDEX IF NOT EXISTS idx_professional_profile_active_true_partial
ON professional_profile (id)
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_available_slot_professional_status
ON available_slot (professional_id, status);
