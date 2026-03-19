CREATE INDEX IF NOT EXISTS idx_booking_user_start
    ON booking (user_id, start_date_time);
