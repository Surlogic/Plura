-- Normaliza contratos publicos de planes a Profesional / Local / Enterprise.
-- Algunos ambientes historicos tienen V13/V51 marcadas como aplicadas pero no conservan
-- la tabla legacy de suscripciones; en esos casos esta migracion debe ser no-op.
DO $$
BEGIN
    IF to_regclass('public.subscription') IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'subscription'
              AND column_name = 'plan'
        )
    THEN
        UPDATE public.subscription
        SET "plan" = 'PLAN_PROFESSIONAL'
        WHERE "plan" = 'PLAN_BASIC';

        UPDATE public.subscription
        SET "plan" = 'PLAN_LOCAL'
        WHERE "plan" IN ('PLAN_PRO', 'PLAN_PROFESIONAL');

        UPDATE public.subscription
        SET "plan" = 'PLAN_ENTERPRISE'
        WHERE "plan" = 'PLAN_PREMIUM';

        ALTER TABLE public.subscription
            DROP CONSTRAINT IF EXISTS subscription_plan_check;

        ALTER TABLE public.subscription
            ADD CONSTRAINT subscription_plan_check
            CHECK ("plan" IN ('PLAN_PROFESSIONAL', 'PLAN_LOCAL', 'PLAN_ENTERPRISE'));
    END IF;
END $$;
