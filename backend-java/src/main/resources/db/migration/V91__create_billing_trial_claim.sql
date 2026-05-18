CREATE TABLE IF NOT EXISTS billing_trial_claim (
    id BIGSERIAL PRIMARY KEY,
    plan_code VARCHAR(30) NOT NULL,
    email_hash VARCHAR(64),
    phone_hash VARCHAR(64),
    oauth_identity_hash VARCHAR(64),
    first_user_id BIGINT NOT NULL,
    first_professional_id BIGINT NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT billing_trial_claim_identity_check
        CHECK (email_hash IS NOT NULL OR phone_hash IS NOT NULL OR oauth_identity_hash IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_trial_claim_plan_email_hash
    ON billing_trial_claim (plan_code, email_hash)
    WHERE email_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_trial_claim_plan_phone_hash
    ON billing_trial_claim (plan_code, phone_hash)
    WHERE phone_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_trial_claim_plan_oauth_identity_hash
    ON billing_trial_claim (plan_code, oauth_identity_hash)
    WHERE oauth_identity_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_trial_claim_first_user
    ON billing_trial_claim (first_user_id);

CREATE INDEX IF NOT EXISTS idx_billing_trial_claim_first_professional
    ON billing_trial_claim (first_professional_id);
