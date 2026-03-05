-- Source: backend-java/db/phase4_schedule_summary_2026_03_05.sql
-- Phase 4 availability summary foundation

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS next_available_at timestamp NULL;

-- Backfill inicial en base a available_slot para no arrancar en NULL masivo.
WITH next_slots AS (
    SELECT s.professional_id,
           MIN(s.start_at) AS next_start
    FROM available_slot s
    WHERE s.status = 'AVAILABLE'
      AND s.start_at >= now()
      AND s.start_at < now() + interval '14 day'
    GROUP BY s.professional_id
)
UPDATE professional_profile p
SET next_available_at = n.next_start
FROM next_slots n
WHERE p.id = n.professional_id;

CREATE INDEX IF NOT EXISTS idx_professional_profile_next_available_at
  ON professional_profile (next_available_at);
