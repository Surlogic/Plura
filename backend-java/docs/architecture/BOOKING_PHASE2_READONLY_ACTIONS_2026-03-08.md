# Booking Phase 2 Read-Only Actions

## Objetivo

Esta fase agrega evaluacion read-only de acciones sobre reservas sin ejecutar comandos mutantes ni tocar providers de pago.

## Que se implemento

- `policySnapshotJson` ahora se completa al crear la reserva.
- Se introdujo `BookingPolicySnapshot` como payload tipado y estable para congelar la policy efectiva aplicable a una reserva.
- Se agrego `GET /reservas/{id}/actions` y alias `GET /bookings/{id}/actions`.
- El endpoint funciona para:
  - cliente dueno de la reserva
  - profesional dueno de la reserva
- Se agrego un evaluador read-only MVP con:
  - `canCancel`
  - `canReschedule`
  - `canMarkNoShow`
  - `refundPreviewAmount`
  - `retainPreviewAmount`
  - `suggestedAction`
  - `reasonCodes`
  - `messageCode`
  - `messageParams`
  - `plainTextFallback`

## Contenido de `policySnapshotJson`

El snapshot guarda:

- `sourcePolicyId`
- `sourcePolicyVersion`
- `professionalId`
- `resolvedAt`
- `allowClientCancellation`
- `allowClientReschedule`
- `cancellationWindowHours`
- `rescheduleWindowHours`
- `maxClientReschedules`
- `retainDepositOnLateCancellation`

## Reglas MVP implementadas

- Cancelacion gratis hasta `cancellationWindowHours` antes del turno.
- Si se supera esa ventana y `retainDepositOnLateCancellation = true`, se retiene:
  - `depositAmount` si `paymentType = DEPOSIT`
  - `servicePriceSnapshot` si `paymentType = FULL_PREPAY`
- Reagendamiento permitido hasta `rescheduleWindowHours` antes.
- Limite por `maxClientReschedules`.
- Si reagendar evita perdida economica, `suggestedAction = RESCHEDULE`.
- `canMarkNoShow` solo para profesional y solo despues de iniciada la reserva.
- Si el profesional cancela, el preview es devolucion total del monto prepagado.

## Limites y supuestos

- No hay comandos mutantes todavia.
- No hay refunds reales ni estado financiero persistido por reserva.
- La moneda del preview queda fija en `UYU` como supuesto temporal de esta fase.
- Si una reserva vieja no tiene snapshot, el endpoint cae a `LIVE_FALLBACK` usando la policy vigente del profesional y agrega `POLICY_SNAPSHOT_FALLBACK` en `reasonCodes`.
- Para `DEPOSIT`, el preview requiere `deposit_amount` persistido en `professional_service` y snapshoteado en `booking`.

## Pendiente para fase siguiente

- Comandos atomicos de cancelacion y reagendamiento.
- Persistencia de decision snapshot por accion.
- Idempotency keys para comandos mutantes.
- Estado economico agregado por reserva.
- Integracion de refunds reales y conciliacion con provider.
