ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_payout_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_payout_country VARCHAR(2);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_beneficiary_first_name VARCHAR(120);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_beneficiary_last_name VARCHAR(120);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_beneficiary_document_type VARCHAR(30);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_beneficiary_document_number VARCHAR(64);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_bank_code VARCHAR(20);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_bank_branch VARCHAR(20);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_bank_account_number VARCHAR(64);

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_bank_account_type VARCHAR(20);
