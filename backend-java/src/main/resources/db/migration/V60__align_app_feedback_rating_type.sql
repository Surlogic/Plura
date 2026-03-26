ALTER TABLE app_feedback
    ALTER COLUMN rating TYPE INTEGER USING rating::integer;
