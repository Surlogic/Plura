-- Billing subscriptions foundation
-- Create subscription, payment_event and payment_transaction tables.

CREATE TABLE IF NOT EXISTS subscription (
    id VARCHAR(36) PRIMARY KEY,
    professional_id BIGINT NOT NULL UNIQUE REFERENCES professional_profile(id),
    "plan" VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_subscription_id VARCHAR(128),
    provider_customer_id VARCHAR(128),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    plan_amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL,
    expected_currency VARCHAR(10) NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_provider_sub_id ON subscription(provider, provider_subscription_id);

CREATE TABLE IF NOT EXISTS payment_event (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(30) NOT NULL,
    provider_event_id VARCHAR(200) NOT NULL,
    provider_object_id VARCHAR(200),
    event_type VARCHAR(80) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    payload_json TEXT,
    professional_id BIGINT REFERENCES professional_profile(id),
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP,
    processing_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_event_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_event_created_at ON payment_event(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_event_professional ON payment_event(professional_id);

CREATE TABLE IF NOT EXISTS payment_transaction (
    id VARCHAR(36) PRIMARY KEY,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id),
    subscription_id VARCHAR(36) REFERENCES subscription(id),
    provider VARCHAR(30) NOT NULL,
    provider_payment_id VARCHAR(200),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_transaction_provider_payment UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_professional ON payment_transaction(professional_id);
CREATE INDEX IF NOT EXISTS idx_payment_transaction_created_at ON payment_transaction(created_at);

ALTER TABLE subscription
    ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE subscription
    ADD COLUMN IF NOT EXISTS expected_currency VARCHAR(10) NOT NULL DEFAULT 'UYU';
