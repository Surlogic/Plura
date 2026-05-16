-- Agrega persistencia de prueba gratuita para Plura Core y conserva aliases legacy.
DO $$
BEGIN
    IF to_regclass('public.subscription') IS NOT NULL THEN
        ALTER TABLE public.subscription
            ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS payment_method_attached_at TIMESTAMP NULL,
            ADD COLUMN IF NOT EXISTS trial_source VARCHAR(40) NULL;

        ALTER TABLE public.subscription
            DROP CONSTRAINT IF EXISTS subscription_plan_check;

        ALTER TABLE public.subscription
            ADD CONSTRAINT subscription_plan_check
            CHECK ("plan" IN ('PLAN_CORE', 'PLAN_PROFESSIONAL', 'PLAN_LOCAL', 'PLAN_ENTERPRISE'));

        ALTER TABLE public.subscription
            DROP CONSTRAINT IF EXISTS subscription_status_check;

        ALTER TABLE public.subscription
            ADD CONSTRAINT subscription_status_check
            CHECK (status IN ('CHECKOUT_PENDING', 'TRIALING', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'));
    END IF;
END $$;
