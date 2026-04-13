ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS prepaid_processing_fee_amount_snapshot NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS prepaid_total_amount_snapshot NUMERIC(12, 2);
