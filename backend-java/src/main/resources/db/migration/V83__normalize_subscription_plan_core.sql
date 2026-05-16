-- Normaliza subscription.plan al unico codigo canonico activo: PLAN_CORE.
-- Debe ser no-op en ambientes que no tengan la tabla/columna legacy de suscripciones.
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
        ALTER TABLE public.subscription
            DROP CONSTRAINT IF EXISTS subscription_plan_check;

        UPDATE public.subscription
        SET "plan" = 'PLAN_CORE'
        WHERE "plan" IN (
            'PLAN_BASIC',
            'PLAN_PRO',
            'PLAN_PROFESIONAL',
            'PLAN_PREMIUM',
            'PLAN_PROFESSIONAL',
            'PLAN_LOCAL',
            'PLAN_ENTERPRISE',
            'PLAN_CORE'
        );

        ALTER TABLE public.subscription
            ADD CONSTRAINT subscription_plan_check
            CHECK ("plan" IN ('PLAN_CORE'));
    END IF;
END $$;
