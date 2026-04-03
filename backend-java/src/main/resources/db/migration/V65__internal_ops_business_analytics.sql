ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS service_category_slug_snapshot VARCHAR(120),
    ADD COLUMN IF NOT EXISTS service_category_name_snapshot VARCHAR(120),
    ADD COLUMN IF NOT EXISTS professional_rubro_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS professional_city_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS professional_country_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS source_platform_snapshot VARCHAR(20);

UPDATE booking AS b
SET
    service_category_slug_snapshot = COALESCE(b.service_category_slug_snapshot, c.slug),
    service_category_name_snapshot = COALESCE(b.service_category_name_snapshot, c.name),
    professional_rubro_snapshot = COALESCE(b.professional_rubro_snapshot, p.rubro),
    professional_city_snapshot = COALESCE(b.professional_city_snapshot, p.city),
    professional_country_snapshot = COALESCE(b.professional_country_snapshot, p.country)
FROM professional_service AS s
LEFT JOIN categories AS c ON c.id = s.category_id
LEFT JOIN professional_profile AS p ON p.id = s.professional_id
WHERE s.id = b.service_id
  AND (
      b.service_category_slug_snapshot IS NULL
      OR b.service_category_name_snapshot IS NULL
      OR b.professional_rubro_snapshot IS NULL
      OR b.professional_city_snapshot IS NULL
      OR b.professional_country_snapshot IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_booking_created_status
    ON booking (created_at, status);

CREATE INDEX IF NOT EXISTS idx_booking_category_created
    ON booking (service_category_slug_snapshot, created_at);

CREATE INDEX IF NOT EXISTS idx_booking_prof_city_created
    ON booking (professional_city_snapshot, created_at);

CREATE TABLE IF NOT EXISTS app_product_event (
    id BIGSERIAL PRIMARY KEY,
    event_key VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    platform VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    source_surface VARCHAR(50),
    search_type VARCHAR(30),
    query_text VARCHAR(255),
    category_slug VARCHAR(120),
    category_label VARCHAR(255),
    professional_id BIGINT,
    professional_slug VARCHAR(255),
    professional_rubro VARCHAR(255),
    service_id VARCHAR(36),
    city VARCHAR(255),
    country VARCHAR(255),
    result_count INTEGER,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_product_event_key_occurred
    ON app_product_event (event_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_category_occurred
    ON app_product_event (category_slug, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_professional_occurred
    ON app_product_event (professional_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_product_event_city_occurred
    ON app_product_event (city, occurred_at DESC);
