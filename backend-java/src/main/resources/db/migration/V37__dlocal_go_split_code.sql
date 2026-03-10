ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS dlocal_split_code VARCHAR(120);
