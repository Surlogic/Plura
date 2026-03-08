# Booking Phase 3: Atomic Commands Foundation

## Scope implemented

This phase converts the read-only action evaluation from Phase 2 into atomic backend commands for:

- client cancellation
- professional cancellation
- client reschedule
- professional reschedule
- professional manual no-show
- professional manual completion

The implementation keeps payments and refunds as preview-only decisions. No provider calls, no webhooks, and no financial ledger were added in this phase.

## What changed

- Added atomic mutation endpoints for cancellation and reschedule.
- Reused the Phase 2 `BookingActionsEvaluator` as the source of truth for command eligibility.
- Added pessimistic locking on `booking` and `professional_profile` for mutation flows.
- Persisted one `booking_action_decision` row per successful command with:
  - actor
  - action type
  - status before/after
  - refund/retain preview
  - reason codes
  - message code and params
  - plain text fallback
  - decision snapshot JSON
- Registered append-only `booking_event` entries for cancel, reschedule, no-show and complete.
- Routed legacy professional `PUT /profesional/reservas/{id}` terminal transitions through the new command path for:
  - `CANCELLED`
  - `NO_SHOW`
  - `COMPLETED`

## Rules reused from Phase 2

The command layer does not reimplement cancellation or reschedule rules. It re-evaluates them at execution time with the same evaluator used by:

- `GET /reservas/{id}/actions`
- `GET /bookings/{id}/actions`

Reused Phase 2 MVP rules:

- free cancellation until `cancellationWindowHours`
- late cancellation retention over prepaid amount when the snapshot policy says so
- reschedule allowed until `rescheduleWindowHours`
- max `maxClientReschedules` per booking
- professional cancellation preview implies full refund preview
- professional manual no-show eligibility starts after booking start time

## Decision snapshot persistence

Each successful command stores a `decision_snapshot_json` with the Phase 2 evaluation summary plus action-specific details.

Current action-specific fields:

- cancel:
  - `policySource`
  - `bookingStartDateTime`
  - `bookingTimezone`
  - optional `requestReason`
- reschedule:
  - `policySource`
  - `previousStartDateTime`
  - `nextStartDateTime`
  - `previousTimezone`
  - `nextTimezone`
  - `rescheduleCountBefore`
  - `rescheduleCountAfter`
- no-show:
  - `policySource`
  - `markedAt`
- complete:
  - `completedAt`

## Concurrency and consistency

- `booking` mutations use pessimistic write lock through `findDetailedByIdForUpdate(...)`.
- reschedule also locks the professional row with `findByIdForUpdate(...)` before checking the new slot.
- slot availability is revalidated at execution time, not trusted from the preview endpoint.
- the booking keeps its existing `@Version` column as an extra optimistic safety layer.

## Known limits of this phase

- No idempotency key support yet for command retries.
- No provider refund execution. Financial outcome codes are internal placeholders:
  - `PENDING_REFUND_REVIEW`
  - `RETENTION_RECORDED`
  - `NO_FINANCIAL_ACTION`
- No no-show automatic job.
- No service change during reschedule.
- No service-level policy overrides.
- Manual completion is not yet represented in `GET /reservas/{id}/actions`.
- Manual no-show uses the current MVP preview model and does not execute real financial settlement.

## Pending for Phase 4

- refund execution and provider integration
- financial aggregate per booking
- idempotency key support for command endpoints
- decision snapshot extension for provider/refund artifacts
- backend-driven command failure payloads with structured reason codes
- optional policy versioning beyond the current snapshot model
