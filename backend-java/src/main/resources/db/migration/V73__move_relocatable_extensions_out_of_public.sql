CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
          AND extnamespace = 'public'::regnamespace
    ) THEN
        EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'unaccent'
          AND extnamespace = 'public'::regnamespace
    ) THEN
        EXECUTE 'ALTER EXTENSION unaccent SET SCHEMA extensions';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, COALESCE(value, ''));
$$;
