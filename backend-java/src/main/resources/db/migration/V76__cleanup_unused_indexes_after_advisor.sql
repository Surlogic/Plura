-- Cleanup de indices que Supabase Advisor sigue marcando como no usados
-- y que el codigo actual ya no necesita o tiene cubiertos por otros indices.

-- Billing / payouts / reminders / favorites / push devices
DROP INDEX IF EXISTS idx_booking_payout_record_professional;
DROP INDEX IF EXISTS idx_booking_review_reminder_user_updated_at;
DROP INDEX IF EXISTS idx_client_favorite_professional_professional;
DROP INDEX IF EXISTS idx_client_push_device_user_enabled;
DROP INDEX IF EXISTS idx_payment_event_professional;
DROP INDEX IF EXISTS idx_payment_transaction_professional;
DROP INDEX IF EXISTS idx_payment_event_refund_record;
DROP INDEX IF EXISTS idx_payment_event_payment_transaction;
DROP INDEX IF EXISTS idx_payment_event_payout_record;
DROP INDEX IF EXISTS idx_payment_transaction_subscription;

-- Auth / oauth / provider ops
DROP INDEX IF EXISTS flyway_schema_history_s_idx;
DROP INDEX IF EXISTS idx_refresh_token_expires;
DROP INDEX IF EXISTS idx_auth_refresh_token_user_revoked_at;
DROP INDEX IF EXISTS idx_app_user_provider;
DROP INDEX IF EXISTS idx_app_user_provider_id;
DROP INDEX IF EXISTS idx_provider_operation_transaction;

-- Reviews
DROP INDEX IF EXISTS idx_booking_review_business_replied_by_user;
DROP INDEX IF EXISTS idx_booking_review_user_created_at;
DROP INDEX IF EXISTS idx_booking_review_business_replied_at;

-- Search legacy sobre tablas base, hoy reemplazado por materialized views/search docs
DROP INDEX IF EXISTS idx_prof_name_trgm;
DROP INDEX IF EXISTS idx_service_name_trgm;
DROP INDEX IF EXISTS idx_prof_lat_lng;
DROP INDEX IF EXISTS idx_professional_profile_has_availability_today;
DROP INDEX IF EXISTS idx_professional_profile_next_available_at;
DROP INDEX IF EXISTS idx_professional_profile_rubro_trgm;
DROP INDEX IF EXISTS idx_professional_profile_geom_gist;
DROP INDEX IF EXISTS idx_professional_profile_headline_trgm;
DROP INDEX IF EXISTS idx_professional_profile_location_text_trgm;
