CREATE TABLE IF NOT EXISTS booking_review (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL CHECK (length(btrim(review_text)) > 0),
    business_reply_text TEXT,
    business_replied_at TIMESTAMP,
    business_replied_by_user_id BIGINT REFERENCES app_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_booking_review_reply_text_non_blank
        CHECK (business_reply_text IS NULL OR length(btrim(business_reply_text)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_review_professional_created_at
    ON booking_review(professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_review_user_created_at
    ON booking_review(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_review_business_replied_at
    ON booking_review(business_replied_at DESC NULLS LAST);