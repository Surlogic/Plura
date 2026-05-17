ALTER TABLE auth_phone_verification
    ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(100);

UPDATE auth_phone_verification
SET provider_request_id = 'legacy-' || id
WHERE provider_request_id IS NULL;

ALTER TABLE auth_phone_verification
    ALTER COLUMN provider_request_id SET NOT NULL;
