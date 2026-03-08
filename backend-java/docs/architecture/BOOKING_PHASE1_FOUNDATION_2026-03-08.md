# Booking Phase 0 + Phase 1 Foundation

## Que cambio

- `Booking` dejo de depender solo de un estado generico en el dominio Java.
  - Ahora usa `BookingOperationalStatus` como estado operativo explicito.
  - Se agregaron `timezone`, `rescheduleCount`, `cancelledAt`, `completedAt`, `noShowMarkedAt` y `version`.
- Se capturan snapshots minimos del servicio al crear la reserva:
  - `serviceNameSnapshot`
  - `servicePriceSnapshot`
  - `serviceDurationSnapshot`
  - `servicePostBufferMinutesSnapshot`
  - `servicePaymentTypeSnapshot`
- `professional_service` ahora persiste `payment_type` en backend. Antes existia en tipos de frontend, pero no en el modelo Java/Postgres.
- Se agrego auditoria append-only con `booking_event`.
- Se agrego una base simple de politica editable por profesional con `booking_policy`.
- Se mantuvo compatibilidad externa:
  - Los endpoints existentes siguen exponiendo `status`.
  - Ese `status` ahora se deriva del estado operativo.
  - Se agregaron campos nuevos compatibles como `timezone`, `paymentType` y `rescheduleCount`.

## Por que se cambio

- La reserva necesitaba una base de dominio donde cancelacion, reagendamiento y no-show no quedaran atados a un unico `booking.status`.
- Las respuestas de reservas necesitaban dejar de depender del servicio actual y pasar a depender de snapshots congelados.
- La siguiente fase necesita un lugar persistente para:
  - evaluar acciones (`GET /reservas/{id}/actions`)
  - capturar snapshot de policy por reserva
  - ejecutar cancelacion y reagendamiento atomicos
  - registrar impactos economicos sin depender de frontend

## Supuestos tomados

- Se mantuvo la columna fisica `booking.status` por compatibilidad de base y de rollout. En Java ahora representa solo estado operativo.
- `timezone` de la reserva se inicializa con la timezone actual de la app (`app.timezone`) porque hoy Plura opera con una timezone de sistema.
- No se implemento versionado complejo de policy todavia. Se creo `booking_policy` como configuracion editable base por profesional.
- No se implemento snapshot de policy todavia; solo se dejo `policySnapshotJson` preparado en `booking`.
- El tipo de cobro default es `ON_SITE` cuando no se informa otro valor.

## Que queda pendiente para Fase 2

- Snapshot real de policy por reserva al momento de crear o mutar.
- Endpoint de evaluacion de acciones:
  - `GET /reservas/{id}/actions`
- Comandos atomicos:
  - cancelacion por cliente
  - cancelacion por profesional
  - reagendamiento por cliente
  - reagendamiento por profesional
  - marcado manual de no-show
- Decision snapshot por accion con `reasonCodes`, mensajes y consecuencias.
- Base economica agregada por reserva y luego refunds/cobros reales.
- Idempotency keys para comandos mutantes expuestos publicamente.

## Riesgos a revisar

- Reservas historicas dependen de que la migracion backfille snapshots correctamente desde `professional_service`.
- La app sigue usando una timezone global; si mas adelante hay timezone por profesional, la creacion de reservas debera usar esa fuente.
- Existe deuda historica porque `professional_service.price` sigue siendo `String`; el snapshot en reserva ya se guarda como `NUMERIC`, pero el origen todavia no esta normalizado del todo.
