-- Functional integrity audit (dashboard profesional -> DB -> pagina publica)
-- Usage (psql):
--   \set slug 'tu-slug-profesional'
--   \i backend-java/db/functional_integrity_audit.sql

\echo '== Profesional objetivo =='
SELECT
  p.id,
  p.slug,
  p.active,
  p.rubro,
  p.location,
  p.public_headline,
  p.public_about,
  u.full_name,
  u.phone_number
FROM professional_profile p
JOIN app_user u ON u.id = p.user_id
WHERE p.slug = :'slug';

\echo '== Servicios (DB real) =='
SELECT
  s.id,
  s.name,
  s.price,
  s.duration,
  s.active,
  s.created_at
FROM professional_service s
JOIN professional_profile p ON p.id = s.professional_id
WHERE p.slug = :'slug'
ORDER BY s.created_at DESC;

\echo '== Servicios visibles en pagina publica (solo activos) =='
SELECT
  s.id,
  s.name,
  s.price,
  s.duration
FROM professional_service s
JOIN professional_profile p ON p.id = s.professional_id
WHERE p.slug = :'slug'
  AND COALESCE(s.active, true) = true
ORDER BY s.created_at DESC;

\echo '== Schedule JSON en DB =='
SELECT
  p.id,
  p.slug,
  p.schedule_json,
  CASE
    WHEN p.schedule_json IS NULL OR btrim(p.schedule_json) = '' THEN false
    ELSE jsonb_typeof(p.schedule_json::jsonb -> 'days') = 'array'
  END AS has_days_array,
  CASE
    WHEN p.schedule_json IS NULL OR btrim(p.schedule_json) = '' THEN 0
    ELSE jsonb_array_length(COALESCE(p.schedule_json::jsonb -> 'days', '[]'::jsonb))
  END AS days_count
FROM professional_profile p
WHERE p.slug = :'slug';

\echo '== Duplicados de day en schedule_json (debe devolver 0 filas) =='
WITH days AS (
  SELECT
    p.slug,
    lower(COALESCE(day_item->>'day', '')) AS day_key
  FROM professional_profile p
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.schedule_json::jsonb -> 'days', '[]'::jsonb)) AS day_item
  WHERE p.slug = :'slug'
)
SELECT slug, day_key, count(*) AS duplicates
FROM days
WHERE day_key <> ''
GROUP BY slug, day_key
HAVING count(*) > 1;

\echo '== Reservas del profesional =='
SELECT
  b.id,
  b.start_date_time,
  b.status,
  s.id AS service_id,
  s.name AS service_name,
  s.active AS service_active,
  u.id AS client_id,
  u.full_name AS client_name
FROM booking b
JOIN professional_profile p ON p.id = b.professional_id
JOIN professional_service s ON s.id = b.service_id
JOIN app_user u ON u.id = b.user_id
WHERE p.slug = :'slug'
ORDER BY b.start_date_time DESC;

\echo '== Inconsistencias: reservas contra servicio/profesional inactivo =='
SELECT
  b.id,
  b.status,
  b.start_date_time,
  p.slug,
  p.active AS professional_active,
  s.active AS service_active
FROM booking b
JOIN professional_profile p ON p.id = b.professional_id
JOIN professional_service s ON s.id = b.service_id
WHERE p.slug = :'slug'
  AND (
    COALESCE(p.active, true) = false
    OR COALESCE(s.active, true) = false
  )
ORDER BY b.start_date_time DESC;

\echo '== Integridad global: tabla legacy profesional_service (debe estar vacia) =='
SELECT count(*) AS legacy_profesional_service_rows
FROM profesional_service;
