-- Reponer indices de FKs que Supabase Advisor siguio marcando como faltantes
-- despues del cleanup general de V71.

CREATE INDEX IF NOT EXISTS idx_booking_payout_record_professional
    ON booking_payout_record (professional_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_review_reminder_user_updated_at
    ON booking_review_reminder (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_favorite_professional_professional
    ON client_favorite_professional (professional_id);

CREATE INDEX IF NOT EXISTS idx_client_push_device_user_enabled
    ON client_push_device (user_id, enabled, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_event_professional
    ON payment_event (professional_id);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_professional
    ON payment_transaction (professional_id);
