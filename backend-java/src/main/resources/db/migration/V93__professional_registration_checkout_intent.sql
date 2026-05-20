CREATE TABLE IF NOT EXISTS professional_registration_checkout_intent (
    id VARCHAR(36) PRIMARY KEY,
    checkout_ref VARCHAR(80) NOT NULL,
    email VARCHAR(320) NOT NULL,
    plan_code VARCHAR(40) NOT NULL,
    registration_reference VARCHAR(160) NOT NULL,
    preapproval_plan_id VARCHAR(160),
    provider_subscription_id VARCHAR(160),
    provider VARCHAR(40) NOT NULL,
    status VARCHAR(32) NOT NULL,
    checkout_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_prof_reg_checkout_intent_ref
    ON professional_registration_checkout_intent (checkout_ref);

CREATE UNIQUE INDEX IF NOT EXISTS uk_prof_reg_checkout_intent_registration_reference
    ON professional_registration_checkout_intent (registration_reference);

CREATE INDEX IF NOT EXISTS idx_prof_reg_checkout_intent_provider_subscription
    ON professional_registration_checkout_intent (provider, provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_prof_reg_checkout_intent_email_status
    ON professional_registration_checkout_intent (email, status);

CREATE INDEX IF NOT EXISTS idx_prof_reg_checkout_intent_expires_at
    ON professional_registration_checkout_intent (expires_at);
