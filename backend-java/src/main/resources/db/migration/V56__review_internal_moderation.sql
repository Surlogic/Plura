ALTER TABLE booking_review
    ADD COLUMN text_hidden_by_internal_ops BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN internal_moderation_note TEXT;
