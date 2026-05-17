CREATE TABLE auth_registration_phone_verification (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(30) NOT NULL,
    provider_request_id VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_auth_registration_phone_verification_phone_created
    ON auth_registration_phone_verification (phone_number, created_at DESC);

CREATE INDEX idx_auth_registration_phone_verification_expires
    ON auth_registration_phone_verification (expires_at);
