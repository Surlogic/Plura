-- App feedback: internal product feedback from clients and professionals
CREATE TABLE app_feedback (
    id              BIGSERIAL PRIMARY KEY,
    author_user_id  BIGINT       NOT NULL REFERENCES app_user(id),
    author_role     VARCHAR(20)  NOT NULL CHECK (author_role IN ('CLIENT', 'PROFESSIONAL')),
    rating          SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text            VARCHAR(2000),
    category        VARCHAR(30)  CHECK (category IN ('BUG', 'UX', 'PAYMENTS', 'BOOKING', 'DISCOVERY', 'OTHER')),
    context_source  VARCHAR(100),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_feedback_author ON app_feedback (author_user_id, created_at DESC);
CREATE INDEX idx_app_feedback_status ON app_feedback (status, created_at DESC);
