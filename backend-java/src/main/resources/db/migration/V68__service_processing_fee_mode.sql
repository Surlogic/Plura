ALTER TABLE professional_service
    ADD COLUMN processing_fee_mode VARCHAR(32) NOT NULL DEFAULT 'INSTANT';

ALTER TABLE booking
    ADD COLUMN prepaid_processing_fee_mode_snapshot VARCHAR(32) NOT NULL DEFAULT 'INSTANT';
