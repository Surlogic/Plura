-- Hardening for Supabase Data API / Security Advisor findings.
-- The application uses Supabase as managed PostgreSQL behind the Spring backend,
-- so the safe default is to expose an empty reviewed schema instead of `public`.

CREATE SCHEMA IF NOT EXISTS api_public;

COMMENT ON SCHEMA api_public IS
    'Schema expuesto a Supabase Data API. Mantener vacio salvo vistas o funciones publicas auditadas.';

DO $$
DECLARE
    role_name text;
BEGIN
    FOR role_name IN
        SELECT unnest(ARRAY['anon', 'authenticated', 'service_role'])
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_roles
            WHERE rolname = role_name
        ) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM %I', role_name);

            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM %I', role_name);

            EXECUTE format('GRANT USAGE ON SCHEMA api_public TO %I', role_name);
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
            table_record.schemaname,
            table_record.tablename
        );

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = table_record.schemaname
              AND tablename = table_record.tablename
              AND policyname = 'plura_internal_block_data_api_default'
        ) THEN
            EXECUTE format(
                'CREATE POLICY plura_internal_block_data_api_default ON %I.%I FOR ALL USING (false) WITH CHECK (false)',
                table_record.schemaname,
                table_record.tablename
            );
        END IF;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, COALESCE(value, ''));
$$;

CREATE OR REPLACE FUNCTION public.sync_prof_display_name_from_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.professional_profile
  SET display_name = NEW.full_name
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'authenticator'
    ) THEN
        EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas = ''api_public''';
        EXECUTE 'NOTIFY pgrst, ''reload config''';
    END IF;
END $$;
