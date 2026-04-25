-- Cleanup de hallazgos de Supabase Advisor:
-- - elimina indices duplicados o sin uso en el codigo actual
-- - agrega indices faltantes para FKs de billing/reviews

-- auth_refresh_token
DROP INDEX IF EXISTS idx_refresh_token_hash;
DROP INDEX IF EXISTS idx_refresh_token_expiry;

-- professional_profile
DROP INDEX IF EXISTS idx_prof_active;
DROP INDEX IF EXISTS idx_prof_geom;
DROP INDEX IF EXISTS idx_professional_profile_active;
DROP INDEX IF EXISTS idx_professional_profile_active_true_partial;

-- professional_service
DROP INDEX IF EXISTS idx_professional_service_professional;

-- booking
DROP INDEX IF EXISTS idx_booking_created_at_status;
DROP INDEX IF EXISTS idx_booking_user_created;
DROP INDEX IF EXISTS idx_booking_professional_start;

-- available_slot
DROP INDEX IF EXISTS idx_available_slot_prof_start;
DROP INDEX IF EXISTS idx_available_slot_professional_status;

-- auth_session
DROP INDEX IF EXISTS idx_auth_session_user;
DROP INDEX IF EXISTS idx_auth_session_expires;

-- auth/password/verification/audit
DROP INDEX IF EXISTS idx_auth_password_reset_expires;
DROP INDEX IF EXISTS idx_auth_email_verification_expires;
DROP INDEX IF EXISTS idx_auth_phone_verification_expires;
DROP INDEX IF EXISTS idx_auth_otp_challenge_expires;
DROP INDEX IF EXISTS idx_auth_audit_log_event_created;

-- reviews/reminders
DROP INDEX IF EXISTS idx_booking_review_reminder_user_updated_at;
DROP INDEX IF EXISTS idx_booking_review_reminder_last_reminded_at;

-- billing/subscriptions/payments
DROP INDEX IF EXISTS idx_subscription_status;
DROP INDEX IF EXISTS idx_payment_transaction_professional;
DROP INDEX IF EXISTS idx_payment_transaction_created_at;
DROP INDEX IF EXISTS idx_payment_event_created_at;
DROP INDEX IF EXISTS idx_payment_event_professional;
DROP INDEX IF EXISTS idx_booking_payout_record_professional;

-- notifications / feedback / analytics
DROP INDEX IF EXISTS idx_notification_event_recipient_created;
DROP INDEX IF EXISTS idx_notification_event_occurred;
DROP INDEX IF EXISTS idx_app_feedback_author_user_id;
DROP INDEX IF EXISTS idx_app_product_event_category_occurred;
DROP INDEX IF EXISTS idx_app_product_event_professional_occurred;
DROP INDEX IF EXISTS idx_app_product_event_city_occurred;
DROP INDEX IF EXISTS idx_app_product_event_session_occurred;
DROP INDEX IF EXISTS idx_app_product_event_booking_occurred;
DROP INDEX IF EXISTS idx_app_product_event_user_occurred;
DROP INDEX IF EXISTS idx_app_product_event_step_occurred;

-- misc tablas chicas o cubiertas por otros indices/constraints
DROP INDEX IF EXISTS idx_client_push_device_user_enabled;
DROP INDEX IF EXISTS idx_client_favorite_professional_professional;
DROP INDEX IF EXISTS idx_prof_payment_provider_connection_status;
DROP INDEX IF EXISTS idx_app_user_full_name_trgm;
DROP INDEX IF EXISTS idx_search_service_document_mv_professional_trgm;
DROP INDEX IF EXISTS idx_search_service_document_mv_headline_trgm;

-- FKs que Advisor marco sin indice y el codigo si consulta
CREATE INDEX IF NOT EXISTS idx_booking_review_business_replied_by_user
    ON booking_review (business_replied_by_user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_subscription
    ON payment_transaction (subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_event_refund_record
    ON payment_event (refund_record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_event_payment_transaction
    ON payment_event (payment_transaction_id, created_at DESC);
