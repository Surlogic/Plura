-- Move PostGIS out of `public` to avoid exposing extension metadata via Supabase APIs.
-- PostGIS 2.3+ is not relocatable by default, so this follows the documented
-- workaround of temporarily toggling extrelocatable and forcing an extension update.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
    extension_name text;
    installed_version text;
    major_version integer;
    minor_version integer;
    upgrade_target text;
BEGIN
    FOR extension_name IN
        SELECT unnest(ARRAY['postgis', 'postgis_raster', 'postgis_sfcgal'])
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_extension
            WHERE extname = extension_name
              AND extnamespace = 'public'::regnamespace
        ) THEN
            SELECT extversion
            INTO installed_version
            FROM pg_extension
            WHERE extname = extension_name;

            major_version := NULLIF(split_part(installed_version, '.', 1), '')::integer;
            minor_version := COALESCE(
                NULLIF(regexp_replace(split_part(installed_version, '.', 2), '[^0-9].*$', ''), ''),
                '0'
            )::integer;

            upgrade_target := CASE
                WHEN major_version > 3 OR (major_version = 3 AND minor_version >= 5) THEN 'ANY'
                ELSE installed_version || 'next'
            END;

            UPDATE pg_extension
            SET extrelocatable = true
            WHERE extname = extension_name;

            EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', extension_name);
            EXECUTE format('ALTER EXTENSION %I UPDATE TO %L', extension_name, upgrade_target);
            EXECUTE format('ALTER EXTENSION %I UPDATE', extension_name);

            UPDATE pg_extension
            SET extrelocatable = false
            WHERE extname = extension_name;
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    role_name text;
BEGIN
    EXECUTE 'REVOKE ALL ON SCHEMA extensions FROM PUBLIC';

    FOR role_name IN
        SELECT unnest(ARRAY['anon', 'authenticated', 'service_role'])
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_roles
            WHERE rolname = role_name
        ) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA extensions FROM %I', role_name);
        END IF;
    END LOOP;
END $$;
