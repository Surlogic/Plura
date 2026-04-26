-- Best-effort hardening for PostGIS on Supabase-managed PostgreSQL.
-- If the managed role cannot touch `pg_extension`, skip the move without breaking Flyway.

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
            BEGIN
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
            EXCEPTION
                WHEN insufficient_privilege OR feature_not_supported THEN
                    RAISE NOTICE 'Skipping move for extension %: %', extension_name, SQLERRM;
            END;
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

            BEGIN
                EXECUTE format('REVOKE ALL ON TABLE public.spatial_ref_sys FROM %I', role_name);
            EXCEPTION
                WHEN undefined_table OR insufficient_privilege THEN
                    NULL;
            END;

            BEGIN
                EXECUTE format('REVOKE ALL ON TABLE public.geometry_columns FROM %I', role_name);
            EXCEPTION
                WHEN undefined_table OR wrong_object_type OR insufficient_privilege THEN
                    NULL;
            END;

            BEGIN
                EXECUTE format('REVOKE ALL ON TABLE public.geography_columns FROM %I', role_name);
            EXCEPTION
                WHEN undefined_table OR wrong_object_type OR insufficient_privilege THEN
                    NULL;
            END;
        END IF;
    END LOOP;
END $$;
