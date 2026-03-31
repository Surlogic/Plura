-- Dataset QA para reservas/reseñas entre:
-- Profesional real: germanazevedo9@gmail.com (professional_profile.id = 1)
-- Cliente real: admin@surlogicuy.com (app_user.id = 2)
--
-- Importante:
-- - Este archivo no crea usuarios ni servicios.
-- - Las reservas 3, 4 y 5 fueron creadas via endpoints reales del dominio.
-- - Los UPDATEs de timestamps son idempotentes y solo reafirman el estado QA
--   esperado para esos bookings ya existentes.

-- Auditoria rapida de actores y servicio.
SELECT u.id AS user_id, u.email, u.role, pp.id AS professional_profile_id, pp.slug
FROM app_user u
LEFT JOIN professional_profile pp ON pp.user_id = u.id
WHERE u.email IN ('germanazevedo9@gmail.com', 'admin@surlogicuy.com')
ORDER BY u.id;

SELECT ps.id, ps.name, ps.duration, ps.post_buffer_minutes, ps.payment_type, ps.active
FROM professional_service ps
WHERE ps.professional_id = 1
ORDER BY ps.active DESC, ps.name;

-- Reafirma slots pasados coherentes para QA manual.
UPDATE booking
SET start_date_time = TIMESTAMP '2026-03-29 09:00:00',
    start_date_time_utc = TIMESTAMP '2026-03-29 12:00:00'
WHERE id = 3
  AND user_id = 2
  AND professional_id = 1;

UPDATE booking
SET start_date_time = TIMESTAMP '2026-03-30 10:00:00',
    start_date_time_utc = TIMESTAMP '2026-03-30 13:00:00'
WHERE id = 4
  AND user_id = 2
  AND professional_id = 1;

UPDATE booking
SET start_date_time = TIMESTAMP '2026-03-28 11:00:00',
    start_date_time_utc = TIMESTAMP '2026-03-28 14:00:00'
WHERE id = 5
  AND user_id = 2
  AND professional_id = 1;

-- Verificacion final del dataset QA.
SELECT
    b.id,
    b.status,
    b.start_date_time,
    b.completed_at,
    b.service_name_snapshot,
    b.service_duration_snapshot,
    b.service_post_buffer_minutes_snapshot,
    br.id AS review_id,
    br.created_at AS review_created_at,
    brr.reminder_count,
    brr.last_reminded_at
FROM booking b
LEFT JOIN booking_review br ON br.booking_id = b.id
LEFT JOIN booking_review_reminder brr ON brr.booking_id = b.id
WHERE b.id IN (3, 4, 5)
ORDER BY b.id;

SELECT booking_id, event_type, actor_type, actor_user_id, created_at
FROM booking_event
WHERE booking_id IN (3, 4, 5)
ORDER BY booking_id, created_at;
