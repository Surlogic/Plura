CREATE TABLE IF NOT EXISTS booking_review_report (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES booking_review(id) ON DELETE CASCADE,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
    reason VARCHAR(64) NOT NULL,
    note TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_booking_review_report_review_professional_status
        UNIQUE (review_id, professional_id, status),
    CONSTRAINT chk_booking_review_report_note_non_blank
        CHECK (note IS NULL OR length(btrim(note)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_review_report_review_created_at
    ON booking_review_report(review_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_review_report_professional_status
    ON booking_review_report(professional_id, status);
