-- Source: backend-java/db/phase5_search_hardening_2026_03_05.sql
-- Phase 5: search hardening indexes for SQL fallback.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS postgis;
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
