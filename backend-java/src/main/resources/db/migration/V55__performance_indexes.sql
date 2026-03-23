-- Performance indexes for frequently queried columns

-- booking_review: standalone index on professional_id for DISTINCT and aggregate queries
CREATE INDEX IF NOT EXISTS idx_booking_review_professional_id
    ON booking_review (professional_id);

-- app_feedback: standalone FK index for cascading deletes and joins
CREATE INDEX IF NOT EXISTS idx_app_feedback_author_user_id
    ON app_feedback (author_user_id);

-- app_notification: composite index for unread count queries
CREATE INDEX IF NOT EXISTS idx_app_notification_recipient_unread
    ON app_notification (recipient_type, recipient_id, read_at)
    WHERE read_at IS NULL;

-- booking: composite index for professional booking list sorted by date
CREATE INDEX IF NOT EXISTS idx_booking_professional_start
    ON booking (professional_id, start_date_time);
