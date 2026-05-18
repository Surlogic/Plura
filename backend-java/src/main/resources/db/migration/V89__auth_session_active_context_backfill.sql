ALTER TABLE auth_session
    ADD COLUMN IF NOT EXISTS active_context_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS active_professional_id VARCHAR(40),
    ADD COLUMN IF NOT EXISTS active_worker_id VARCHAR(40);
