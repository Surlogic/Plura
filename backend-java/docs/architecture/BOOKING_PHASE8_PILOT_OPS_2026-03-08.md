# Booking Pilot Ops 2026-03-08

## Qué cambió

Se agregó una capa interna mínima para operar bookings pagos en piloto cerrado sin tocar el dominio central:

- endpoints internos `/internal/ops/bookings/**`
- autenticación por `X-Internal-Token`
- consultas de stuck states y errores operativos
- detalle end-to-end de una reserva paga
- acciones manuales seguras:
  - retry refund
  - retry payout
  - recompute financial summary
  - reconcile local de una reserva
- auditoría explícita de recompute/reconcile/retry como `booking_event`

## Endpoints internos

Todos requieren header `X-Internal-Token`.

- `GET /internal/ops/bookings/alerts`
  - params:
    - `olderThanMinutes` default `60`
    - `heldOlderThanMinutes` default `1440`
- `GET /internal/ops/bookings/{id}/detail`
- `POST /internal/ops/bookings/{id}/refund/retry`
- `POST /internal/ops/bookings/{id}/payout/retry`
- `POST /internal/ops/bookings/{id}/financial/recompute`
- `POST /internal/ops/bookings/{id}/reconcile`

## Flujo normal

### Booking paga exitosa

1. booking creada
2. charge real aprobado por dLocal
3. `payment_transaction` tipo `BOOKING_CHARGE` queda aprobado
4. `booking_financial_summary` pasa a `HELD`

### Cancelación con refund

1. dominio persiste `booking_action_decision`
2. se crea `booking_refund_record`
3. provider intenta refund real
4. webhook actualiza `payment_transaction`, `payment_event`, `booking_refund_record`
5. `booking_financial_summary` pasa por `REFUND_PENDING` hasta `REFUNDED` o `PARTIALLY_REFUNDED`

### Completado con payout

1. dominio persiste `booking_action_decision`
2. se crea `booking_payout_record`
3. provider intenta payout real
4. webhook actualiza `payment_transaction`, `payment_event`, `booking_payout_record`
5. `booking_financial_summary` pasa por `RELEASE_PENDING` hasta `RELEASED` o `PARTIALLY_RELEASED`

### No-show con payout

Mismo ciclo que `COMPLETE`, pero disparado por decisión de `NO_SHOW` si la política aplicada retiene fondos.

## Qué mirar primero ante una incidencia

Usar `GET /internal/ops/bookings/{id}/detail` y revisar en este orden:

1. `booking.operationalStatus`
2. `financialSummary`
3. `actionDecisions`
4. `refundRecords` / `payoutRecords`
5. `paymentTransactions`
6. `paymentEvents`
7. `bookingEvents`
8. `consistencyIssues`

## Stuck states expuestos

- `PAYMENT_PENDING` viejo
- `HELD` viejo
- `REFUND_PENDING` viejo
- `RELEASE_PENDING` viejo
- refunds `FAILED`
- payouts `FAILED`
- inconsistencias entre summary y evidencia externa

## Cuándo usar cada acción manual

### `refund/retry`

Usar solo si el último `booking_refund_record` está en `FAILED` o `PENDING_MANUAL`.

No usar si:

- ya hay refund `PENDING_PROVIDER`
- ya hay refund aprobado/parcial/refunded

### `payout/retry`

Usar solo si el último `booking_payout_record` está en `FAILED` o `PENDING_MANUAL`.

No usar si:

- ya hay payout `PENDING_PROVIDER`
- ya hay payout aprobado/parcial/completado

### `financial/recompute`

Recalcula `booking_financial_summary` desde evidencia ya persistida.

Usar cuando:

- el summary parece desactualizado
- hubo corrección manual de evidencia externa
- se sospecha drift entre summary y transactions/records

### `reconcile`

Hace una conciliación local mínima:

- recompone summary desde evidencia
- reaplica latest refund record
- reaplica latest payout record

No llama al provider ni reconsulta dLocal. Sirve para alinear el estado local.

## Qué no hacer manualmente

- no editar montos directo en `booking_financial_summary`
- no marcar `booking_refund_record` o `booking_payout_record` como completados a mano
- no insertar `payment_transaction` manual salvo reparación extraordinaria fuera de este runbook
- no reintentar refunds/payouts si ya existe intento `PENDING`
- no usar `reconcile` como sustituto de webhook faltante externo

## Límites conocidos

- no hay panel visual; la operación es por endpoints internos
- no hay alerting externo automático todavía
- `reconcile` es local, no hace fetch a dLocal
- el token interno es estático por entorno; rotación y secret management quedan fuera de esta fase

## Pendiente después de esta fase

- alerting externo
- UI interna/admin
- jobs de barrido para stuck states
- reconciliación batch contra provider
