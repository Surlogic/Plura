CREATE TABLE IF NOT EXISTS app_error_incident (
    id BIGSERIAL PRIMARY KEY,
    fingerprint VARCHAR(128) NOT NULL UNIQUE,
    source VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    error_type VARCHAR(255),
    message TEXT,
    stack_trace TEXT,
    route VARCHAR(512),
    http_method VARCHAR(16),
    http_status INTEGER,
    trace_id VARCHAR(128),
    client_session_id VARCHAR(128),
    context_json TEXT,
    occurrence_count BIGINT NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_error_incident_last_seen
    ON app_error_incident (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_incident_open_last_seen
    ON app_error_incident (resolved_at, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_incident_source_last_seen
    ON app_error_incident (source, last_seen_at DESC);
