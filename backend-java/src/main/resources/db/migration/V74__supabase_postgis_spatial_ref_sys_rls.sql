-- Hardening puntual para Security Advisor de Supabase sobre tablas PostGIS en `public`.
-- `spatial_ref_sys` puede quedar fuera del barrido generico de V70 segun ownership de la extension.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'spatial_ref_sys'
          AND c.relkind IN ('r', 'p')
          AND pg_get_userbyid(c.relowner) = current_user
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'spatial_ref_sys'
          AND policyname = 'plura_internal_block_data_api_default'
    ) THEN
        EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
        EXECUTE '
            CREATE POLICY plura_internal_block_data_api_default
            ON public.spatial_ref_sys
            FOR ALL
            USING (false)
            WITH CHECK (false)
        ';
    END IF;
END $$;
