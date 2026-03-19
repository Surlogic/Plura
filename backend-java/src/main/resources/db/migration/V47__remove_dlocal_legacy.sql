ALTER TABLE professional_profile
    DROP COLUMN IF EXISTS dlocal_payout_enabled,
    DROP COLUMN IF EXISTS dlocal_payout_country,
    DROP COLUMN IF EXISTS dlocal_split_code,
    DROP COLUMN IF EXISTS dlocal_beneficiary_first_name,
    DROP COLUMN IF EXISTS dlocal_beneficiary_last_name,
    DROP COLUMN IF EXISTS dlocal_beneficiary_document_type,
    DROP COLUMN IF EXISTS dlocal_beneficiary_document_number,
    DROP COLUMN IF EXISTS dlocal_bank_code,
    DROP COLUMN IF EXISTS dlocal_bank_branch,
    DROP COLUMN IF EXISTS dlocal_bank_account_number,
    DROP COLUMN IF EXISTS dlocal_bank_account_type;
