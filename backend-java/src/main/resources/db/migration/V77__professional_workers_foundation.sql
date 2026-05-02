CREATE TABLE IF NOT EXISTS professional_worker (
    id BIGSERIAL PRIMARY KEY,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES app_user(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    schedule_json TEXT,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    invite_token_hash VARCHAR(255),
    invite_expires_at TIMESTAMP,
    invited_by_user_id BIGINT REFERENCES app_user(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_professional_worker_status
        CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
    CONSTRAINT chk_professional_worker_slot_duration
        CHECK (slot_duration_minutes IN (10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_worker_owner
    ON professional_worker(professional_id)
    WHERE is_owner = TRUE AND status <> 'REMOVED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_worker_email_active
    ON professional_worker(professional_id, lower(email))
    WHERE status <> 'REMOVED';

CREATE INDEX IF NOT EXISTS idx_professional_worker_professional_status
    ON professional_worker(professional_id, status);

CREATE INDEX IF NOT EXISTS idx_professional_worker_user_status
    ON professional_worker(user_id, status);

CREATE INDEX IF NOT EXISTS idx_professional_worker_email
    ON professional_worker(lower(email));

CREATE TABLE IF NOT EXISTS professional_worker_service (
    id BIGSERIAL PRIMARY KEY,
    worker_id BIGINT NOT NULL REFERENCES professional_worker(id) ON DELETE CASCADE,
    professional_id BIGINT NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
    service_id VARCHAR(36) NOT NULL REFERENCES professional_service(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_professional_worker_service UNIQUE (worker_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_worker_service_worker_active
    ON professional_worker_service(worker_id, active);

CREATE INDEX IF NOT EXISTS idx_professional_worker_service_service
    ON professional_worker_service(service_id);

CREATE INDEX IF NOT EXISTS idx_professional_worker_service_professional
    ON professional_worker_service(professional_id, service_id);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS worker_id BIGINT REFERENCES professional_worker(id) ON DELETE SET NULL;

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS worker_name_snapshot VARCHAR(255);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS worker_email_snapshot VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_booking_worker_start_status
    ON booking(worker_id, start_date_time, status);

CREATE INDEX IF NOT EXISTS idx_booking_professional_worker_start
    ON booking(professional_id, worker_id, start_date_time);

ALTER TABLE available_slot
    ADD COLUMN IF NOT EXISTS worker_id BIGINT REFERENCES professional_worker(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_available_slot_worker_status_start
    ON available_slot(worker_id, status, start_at);

CREATE INDEX IF NOT EXISTS idx_available_slot_professional_worker_start
    ON available_slot(professional_id, worker_id, start_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_available_slot_worker_start
    ON available_slot(worker_id, start_at)
    WHERE worker_id IS NOT NULL;

INSERT INTO professional_worker (
    professional_id,
    user_id,
    email,
    display_name,
    status,
    schedule_json,
    slot_duration_minutes,
    is_owner,
    invited_by_user_id,
    accepted_at,
    created_at,
    updated_at
)
SELECT
    profile.id,
    profile.user_id,
    users.email,
    COALESCE(NULLIF(profile.display_name, ''), users.full_name, users.email),
    'ACTIVE',
    profile.schedule_json,
    COALESCE(profile.slot_duration_minutes, 15),
    TRUE,
    profile.user_id,
    NOW(),
    COALESCE(profile.created_at, NOW()),
    NOW()
FROM professional_profile profile
JOIN app_user users ON users.id = profile.user_id
WHERE NOT EXISTS (
    SELECT 1
    FROM professional_worker existing
    WHERE existing.professional_id = profile.id
      AND existing.is_owner = TRUE
      AND existing.status <> 'REMOVED'
);

INSERT INTO professional_worker_service (
    worker_id,
    professional_id,
    service_id,
    active,
    created_at
)
SELECT
    worker.id,
    service.professional_id,
    service.id,
    TRUE,
    NOW()
FROM professional_service service
JOIN professional_worker worker
    ON worker.professional_id = service.professional_id
   AND worker.is_owner = TRUE
   AND worker.status <> 'REMOVED'
WHERE NOT EXISTS (
    SELECT 1
    FROM professional_worker_service existing
    WHERE existing.worker_id = worker.id
      AND existing.service_id = service.id
);

UPDATE booking booking
SET worker_id = worker.id,
    worker_name_snapshot = COALESCE(booking.worker_name_snapshot, worker.display_name),
    worker_email_snapshot = COALESCE(booking.worker_email_snapshot, worker.email)
FROM professional_worker worker
WHERE booking.worker_id IS NULL
  AND worker.professional_id = booking.professional_id
  AND worker.is_owner = TRUE
  AND worker.status <> 'REMOVED';

UPDATE available_slot slot
SET worker_id = worker.id
FROM professional_worker worker
WHERE slot.worker_id IS NULL
  AND worker.professional_id = slot.professional_id
  AND worker.is_owner = TRUE
  AND worker.status <> 'REMOVED';
