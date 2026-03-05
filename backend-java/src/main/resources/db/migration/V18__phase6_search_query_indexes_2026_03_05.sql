-- Source: backend-java/db/phase6_search_query_indexes_2026_03_05.sql
-- Phase 6: align trigram indexes with current SQL fallback predicates.
-- Safe to run multiple times.

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

CREATE INDEX IF NOT EXISTS idx_app_user_full_name_trgm
ON app_user
USING gin (immutable_unaccent(lower(COALESCE(full_name, ''))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_professional_profile_headline_trgm
ON professional_profile
USING gin (immutable_unaccent(lower(COALESCE(public_headline, ''))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_professional_profile_location_text_trgm
ON professional_profile
USING gin (immutable_unaccent(lower(COALESCE(location_text, location, ''))) gin_trgm_ops);
