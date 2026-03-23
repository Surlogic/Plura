-- V53: Make review_text optional and add visibility control for professional moderation.
-- The professional can hide the text of a review but the rating always counts in aggregates.

ALTER TABLE booking_review ALTER COLUMN review_text DROP NOT NULL;
ALTER TABLE booking_review DROP CONSTRAINT IF EXISTS booking_review_review_text_check;
ALTER TABLE booking_review DROP CONSTRAINT IF EXISTS chk_booking_review_text_non_blank;
-- Re-add: if text is provided it must be non-blank
ALTER TABLE booking_review ADD CONSTRAINT chk_booking_review_text_non_blank
    CHECK (review_text IS NULL OR length(btrim(review_text)) > 0);

ALTER TABLE booking_review ADD COLUMN IF NOT EXISTS text_hidden_by_professional BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE booking_review ADD COLUMN IF NOT EXISTS text_hidden_at TIMESTAMP;
