-- Alinea los plan codes legacy de billing con los enums vigentes del backend.
UPDATE subscription
SET "plan" = 'PLAN_PROFESIONAL'
WHERE "plan" = 'PLAN_PRO';

UPDATE subscription
SET "plan" = 'PLAN_ENTERPRISE'
WHERE "plan" = 'PLAN_PREMIUM';

ALTER TABLE subscription
    DROP CONSTRAINT IF EXISTS subscription_plan_check;

ALTER TABLE subscription
    ADD CONSTRAINT subscription_plan_check
    CHECK ("plan" IN ('PLAN_BASIC', 'PLAN_PROFESIONAL', 'PLAN_ENTERPRISE'));
