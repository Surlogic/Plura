-- Source: backend-java/db/performance_indexes.sql
-- Performance indexes for search, home, and availability queries

-- professional_service: used by search subqueries and public page mapping
CREATE INDEX IF NOT EXISTS idx_professional_service_professional_active
    ON professional_service (professional_id, active);

-- booking: used by findTopProfessionalIdsByStatuses (home page)
CREATE INDEX IF NOT EXISTS idx_booking_status
    ON booking (status);

-- booking: used by countMonthlyBookings (home page stats)
CREATE INDEX IF NOT EXISTS idx_booking_created_at_status
    ON booking (created_at, status);

-- available_slot: used by search date_match and available_now_match
CREATE INDEX IF NOT EXISTS idx_available_slot_prof_status_start
    ON available_slot (professional_id, status, start_at);

-- professional_categories: used by search category filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_professional_categories_professional
    ON professional_categories (professional_id);

-- professional_profile_photos: used by cover image lookup in search
CREATE INDEX IF NOT EXISTS idx_professional_profile_photos_prof_position
    ON professional_profile_photos (professional_id, position);

-- professional_profile: used by search and listing active profiles
CREATE INDEX IF NOT EXISTS idx_professional_profile_active_created
    ON professional_profile (active, created_at DESC);
