# Checklist de Integridad Funcional

Objetivo: validar que lo configurado por el profesional en dashboard se persiste en DB y se refleja en la API/página pública.

## 1) Servicios

1. Crear servicio en dashboard profesional.
2. Verificar DB:
   - `SELECT id, name, price, duration, active FROM professional_service WHERE professional_id = <ID> ORDER BY created_at DESC;`
3. Verificar API pública:
   - `GET /public/profesionales/{slug}`
   - Debe listar solo servicios con `active = true`.
4. Editar servicio y repetir verificación DB/API.
5. Desactivar servicio y verificar que desaparece de API pública.
6. Eliminar servicio y verificar que no aparece en DB/API.

## 2) Horarios

1. Guardar horario desde `/profesional/dashboard/horarios`.
2. Verificar DB:
   - `SELECT schedule_json FROM professional_profile WHERE id = <ID>;`
3. Verificar API pública:
   - `GET /public/profesionales/{slug}`
   - `schedule` debe reflejar el JSON normalizado.
4. Verificar slots:
   - `GET /public/profesionales/{slug}/slots?date=YYYY-MM-DD&serviceId=<serviceId>`
   - Deben respetar días/rangos configurados.

## 3) Perfil público

1. Actualizar nombre, rubro, ubicación y teléfono en `/profesional/dashboard/perfil-negocio`.
2. Actualizar headline/about/photos en `/profesional/dashboard/pagina-publica`.
3. Verificar DB:
   - `professional_profile`: `rubro`, `location`, `public_headline`, `public_about`.
   - `professional_profile_photos`: fotos públicas.
   - `app_user`: `full_name`, `phone_number`.
4. Verificar API pública:
   - `GET /public/profesionales/{slug}` debe reflejar esos datos.

## 4) Reservas y estados

1. Cliente crea reserva.
2. Profesional confirma (`PENDING -> CONFIRMED`).
3. Profesional completa (`CONFIRMED -> COMPLETED`).
4. Verificar DB:
   - `SELECT id, status, start_date_time FROM booking WHERE id = <bookingId>;`
5. Verificar dashboard cliente:
   - `/cliente/reservas` y próxima reserva.

## 5) Inconsistencias críticas

1. Reservas apuntando a servicio/profesional inactivo.
2. Servicios activos que no aparecen en API pública.
3. `schedule_json` inválido o sin 7 días normalizados.
4. Datos del perfil visibles en UI pero no persistidos en DB.

## Ejecución rápida

1. SQL completo:
   - `\set slug 'tu-slug'`
   - `\i backend-java/db/functional_integrity_audit.sql`
2. Script automatizado DB/API:
   - `backend-java/scripts/audit_public_consistency.sh tu-slug`
