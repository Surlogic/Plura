-- Normaliza contratos publicos de planes a Profesional / Local / Enterprise.
UPDATE subscription
SET "plan" = 'PLAN_PROFESSIONAL'
WHERE "plan" = 'PLAN_BASIC';

UPDATE subscription
SET "plan" = 'PLAN_LOCAL'
WHERE "plan" IN ('PLAN_PRO', 'PLAN_PROFESIONAL');

UPDATE subscription
SET "plan" = 'PLAN_ENTERPRISE'
WHERE "plan" = 'PLAN_PREMIUM';

ALTER TABLE subscription
    DROP CONSTRAINT IF EXISTS subscription_plan_check;

ALTER TABLE subscription
    ADD CONSTRAINT subscription_plan_check
    CHECK ("plan" IN ('PLAN_PROFESSIONAL', 'PLAN_LOCAL', 'PLAN_ENTERPRISE'));
