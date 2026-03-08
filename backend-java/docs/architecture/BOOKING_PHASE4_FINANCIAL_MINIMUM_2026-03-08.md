# Booking Phase 4: Minimal Financial Layer

## Scope implemented

This phase adds the minimum financial persistence required per booking without introducing a full payment ledger or provider integration.

Implemented:

- booking financial summary per reservation
- refund record / refund intent per reservation
- financial updates derived from existing booking decisions
- persistent idempotency for booking mutation commands

Not implemented:

- real provider refunds
- payment webhooks for bookings
- reconciliation with external providers
- credits, wallet, coupons or promotions
- service-level financial overrides

## Current financial representation

### `booking_financial_summary`

One row per booking with the minimum aggregate needed for support and later provider integration:

- `amountPaid`
- `amountRetained`
- `amountToRefund`
- `amountRefunded`
- `currency`
- `financialStatus`
- `lastDecisionId`

Current financial statuses:

- `NOT_REQUIRED`
- `PAID`
- `RETAINED`
- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `FAILED`

### `booking_refund_record`

Append-like refund record created when a booking decision requires a refund target.

Stored fields:

- booking id
- actor type / actor user id
- requested amount
- target amount
- status
- reason code
- currency
- provider reference (nullable for now)
- related decision id
- metadata JSON

Current refund statuses:

- `PENDING_MANUAL`
- `PENDING_PROVIDER`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

## Relationship with `booking_action_decision`

Financial execution in this phase does not recalculate business rules.

The flow is:

1. Phase 2 evaluator produces refund / retain preview.
2. Phase 3 command persists `booking_action_decision`.
3. Phase 4 financial layer consumes that persisted decision and updates:
   - `booking_financial_summary`
   - `booking_refund_record` when refund is needed

This keeps domain rules centralized and avoids drift between preview and execution.

## Initialization assumption

Because booking payments are not integrated with a provider yet, the summary is initialized from the booking service snapshot:

- `ON_SITE` => `amountPaid = 0`, `financialStatus = NOT_REQUIRED`
- `DEPOSIT` => `amountPaid = serviceDepositAmountSnapshot`, `financialStatus = PAID`
- `FULL_PREPAY` => `amountPaid = servicePriceSnapshot`, `financialStatus = PAID`

This is an intentional temporary assumption so the reservation domain can move forward without blocking on payment provider work.

## Command integration

Current mutation commands update finance as follows:

- cancel with refund target:
  - summary => `REFUND_PENDING`
  - refund record => created as `PENDING_MANUAL`
- cancel with retain target:
  - summary => `RETAINED`
  - no refund record
- no-show:
  - uses the persisted decision preview
  - with current MVP rules usually leaves zero refund / retain impact unless the evaluator evolves
- reschedule:
  - no financial mutation beyond updating `lastDecisionId`
- complete:
  - no financial mutation beyond updating `lastDecisionId`

## Idempotency

Mutation endpoints now accept optional `Idempotency-Key` header.

Persistent table:

- `booking_command_idempotency`

Current behavior:

- same actor + same command type + same key + same payload:
  - if completed => replay stored `BookingCommandResponse`
  - if in progress => `409 Conflict`
  - if failed => `409 Conflict`, caller must retry with a new key
- same key with different payload => `409 Conflict`

This covers:

- double click
- retry after timeout
- accidental repeated POST with the same key

## Pending for provider / webhooks phase

- booking payment transaction entity tied to booking instead of subscription-only flows
- provider references on financial summary and refund records
- webhook-driven transition from:
  - `REFUND_PENDING` to `REFUNDED`
  - `PENDING_MANUAL` / `PENDING_PROVIDER` to terminal refund states
- partial refund completion handling
- financial failure recovery and retry workflows

## Known limits

- Currency is still hardcoded to `UYU` because booking currency is not yet modeled separately.
- Existing bookings are backfilled with a baseline summary from service snapshots, not reconstructed from historic decisions.
- `amountPaid` is currently a domain assumption for prepaid bookings, not provider-confirmed settlement.
