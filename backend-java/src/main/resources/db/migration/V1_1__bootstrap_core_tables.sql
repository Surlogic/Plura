-- Bootstrap mínimo para permitir reconstrucción desde esquema vacío.
-- Idempotente y pensado para destrabar Flyway en una DB limpia.

CREATE TABLE IF NOT EXISTS app_user (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    provider VARCHAR(20),
    provider_id VARCHAR(255),
    avatar VARCHAR(500),
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    session_version INTEGER NOT NULL DEFAULT 1,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(64),
    password_changed_at TIMESTAMP,
    email_verified_at TIMESTAMP,
    phone_verified_at TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT uq_app_user_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS auth_refresh_token (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_auth_refresh_token_token UNIQUE (token),
    CONSTRAINT fk_auth_refresh_token_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user
    ON auth_refresh_token(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_token_expires
    ON auth_refresh_token(expiry_date);

CREATE TABLE IF NOT EXISTS professional_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    rubro VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    slug VARCHAR(255),
    public_headline VARCHAR(255),
    public_about TEXT,
    logo_url VARCHAR(255),
    banner_url VARCHAR(500),
    instagram VARCHAR(255),
    facebook VARCHAR(255),
    tiktok VARCHAR(255),
    website VARCHAR(255),
    whatsapp VARCHAR(255),
    location VARCHAR(255),
    country VARCHAR(255),
    city VARCHAR(255),
    full_address VARCHAR(255),
    location_text VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating DOUBLE PRECISION NOT NULL DEFAULT 0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    tipo_cliente VARCHAR(255),
    schedule_json TEXT,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
    has_availability_today BOOLEAN NOT NULL DEFAULT FALSE,
    next_available_at TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_professional_profile_user UNIQUE (user_id),
    CONSTRAINT uq_professional_profile_slug UNIQUE (slug),
    CONSTRAINT fk_professional_profile_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_professional_profile_active
    ON professional_profile(active);

CREATE TABLE IF NOT EXISTS professional_profile_photos (
    professional_id BIGINT NOT NULL,
    position INTEGER NOT NULL,
    url VARCHAR(255),
    PRIMARY KEY (professional_id, position),
    CONSTRAINT fk_professional_profile_photos_professional
        FOREIGN KEY (professional_id) REFERENCES professional_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS professional_service (
    id VARCHAR(36) PRIMARY KEY,
    professional_id BIGINT NOT NULL,
    category_id UUID,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(200),
    price VARCHAR(255) NOT NULL,
    duration VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    post_buffer_minutes INTEGER DEFAULT 0,
    deposit_amount NUMERIC(12,2),
    currency VARCHAR(10) NOT NULL DEFAULT 'UYU',
    payment_type VARCHAR(20) NOT NULL DEFAULT 'ON_SITE',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_professional_service_professional
        FOREIGN KEY (professional_id) REFERENCES professional_profile(id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'categories'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_professional_service_category'
        ) THEN
            ALTER TABLE professional_service
                ADD CONSTRAINT fk_professional_service_category
                FOREIGN KEY (category_id) REFERENCES categories(id);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_professional_service_professional
    ON professional_service(professional_id);

CREATE TABLE IF NOT EXISTS booking (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    professional_id BIGINT NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    start_date_time TIMESTAMP NOT NULL,
    start_date_time_utc TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    no_show_marked_at TIMESTAMP,
    service_name_snapshot VARCHAR(120) NOT NULL,
    professional_slug_snapshot VARCHAR(255),
    professional_display_name_snapshot VARCHAR(255),
    professional_location_snapshot VARCHAR(255),
    service_price_snapshot NUMERIC(12,2),
    service_deposit_amount_snapshot NUMERIC(12,2),
    service_currency_snapshot VARCHAR(10) NOT NULL DEFAULT 'UYU',
    service_duration_snapshot VARCHAR(40) NOT NULL,
    service_post_buffer_minutes_snapshot INTEGER NOT NULL DEFAULT 0,
    service_payment_type_snapshot VARCHAR(20) NOT NULL DEFAULT 'ON_SITE',
    policy_snapshot_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_booking_user
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT uq_professional_start UNIQUE (professional_id, start_date_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_professional_start
    ON booking(professional_id, start_date_time);

CREATE INDEX IF NOT EXISTS idx_booking_user_created
    ON booking(user_id, created_at);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'categories'
    ) THEN
        CREATE TABLE IF NOT EXISTS professional_categories (
            professional_id BIGINT NOT NULL,
            category_id UUID NOT NULL,
            PRIMARY KEY (professional_id, category_id),
            CONSTRAINT fk_professional_categories_professional
                FOREIGN KEY (professional_id) REFERENCES professional_profile(id) ON DELETE CASCADE,
            CONSTRAINT fk_professional_categories_category
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
    END IF;
END $$;