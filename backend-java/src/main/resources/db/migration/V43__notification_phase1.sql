CREATE TABLE IF NOT EXISTS notification_event (
    id VARCHAR(36) PRIMARY KEY,
    event_uuid VARCHAR(36) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    aggregate_type VARCHAR(60) NOT NULL,
    aggregate_id VARCHAR(120) NOT NULL,
    source_module VARCHAR(80) NOT NULL,
    source_action VARCHAR(80) NOT NULL,
    recipient_type VARCHAR(30) NOT NULL,
    recipient_id VARCHAR(120) NOT NULL,
    actor_type VARCHAR(30) NULL,
    actor_id VARCHAR(120) NULL,
    payload_json TEXT NULL,
    dedupe_key VARCHAR(200) NULL,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notification_event_event_uuid UNIQUE (event_uuid),
    CONSTRAINT uq_notification_event_dedupe_key UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_event_recipient_created
    ON notification_event (recipient_type, recipient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_event_aggregate
    ON notification_event (aggregate_type, aggregate_id);

CREATE INDEX IF NOT EXISTS idx_notification_event_occurred
    ON notification_event (occurred_at);

CREATE TABLE IF NOT EXISTS app_notification (
    id VARCHAR(36) PRIMARY KEY,
    notification_event_id VARCHAR(36) NOT NULL UNIQUE REFERENCES notification_event(id) ON DELETE CASCADE,
    recipient_type VARCHAR(30) NOT NULL,
    recipient_id VARCHAR(120) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL,
    category VARCHAR(80) NULL,
    action_url VARCHAR(500) NULL,
    action_label VARCHAR(120) NULL,
    read_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_notification_recipient_created
    ON app_notification (recipient_type, recipient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_app_notification_recipient_read
    ON app_notification (recipient_type, recipient_id, read_at);

CREATE TABLE IF NOT EXISTS email_dispatch (
    id VARCHAR(36) PRIMARY KEY,
    notification_event_id VARCHAR(36) NOT NULL UNIQUE REFERENCES notification_event(id) ON DELETE CASCADE,
    recipient_email VARCHAR(320) NOT NULL,
    template_key VARCHAR(120) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    payload_json TEXT NULL,
    status VARCHAR(30) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    next_attempt_at TIMESTAMP NULL,
    provider_message_id VARCHAR(200) NULL,
    error_code VARCHAR(80) NULL,
    error_message VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_status_next_attempt
    ON email_dispatch (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_recipient_created
    ON email_dispatch (recipient_email, created_at);
