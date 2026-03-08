# Booking Phase 5: Provider Integration and Webhooks

## Scope implemented

This phase connects the booking financial domain with real external payment and refund evidence without introducing a full accounting ledger or frontend flows.

Implemented:

- booking checkout session creation against the configured provider
- refund initiation against the provider for booking refund records
- external payment and refund evidence persisted in `payment_transaction`
- webhook processing for booking payment success, refund success, partial refund and refund failure
- booking financial summary recalculated from provider-backed evidence
- explicit booking/service currency instead of implicit default-only assumptions
- Flyway migration version collisions resolved in this branch

Not implemented:

- multi-provider orchestration for bookings
- wallet, credits, coupons or promotions
- accounting ledger
- reconciliation batch jobs
- frontend payment UX

## External payment model

### `payment_transaction`

Existing billing payment transactions now also represent booking money movement.

New booking-oriented usage:

- `transactionType = BOOKING_CHARGE`
- `transactionType = BOOKING_REFUND`
- optional link to `booking`
- optional link to `refundRecord`
- `providerPaymentId`
- `providerStatus`
- `externalReference`
- `payloadJson`
- `approvedAt`
- `failedAt`
- `updatedAt`

This keeps one external-transactions table across subscriptions and bookings instead of creating a second parallel model.

### `payment_event`

Webhook deliveries remain append-only and deduplicated by `(provider, provider_event_id)`.

The event now also stores:

- `booking`
- `refundRecord`
- `paymentTransaction`

That gives support and reconciliation a direct trace from raw webhook to booking/refund mutation.

## Booking financial source of truth

Booking financial state is now derived from two layers:

1. Domain decision:
   - `booking_action_decision`
   - defines refund / retain intent
2. External evidence:
   - `payment_transaction`
   - `payment_event`
   - `booking_refund_record`

The aggregate remains:

- `booking_financial_summary`

This means:

- business rules still come from the booking evaluator / persisted decision
- paid / refunded amounts come from provider-backed evidence, not from service snapshot assumptions

## Current financial behavior

### Initial state

Bookings are no longer initialized as already paid just because the service uses `DEPOSIT` or `FULL_PREPAY`.

Current baseline:

- `ON_SITE` => `NOT_REQUIRED`
- `DEPOSIT` => `PAYMENT_PENDING`
- `FULL_PREPAY` => `PAYMENT_PENDING`

`amountPaid` starts at `0` until a provider charge is approved.

### On approved external charge

When a booking charge webhook is received:

- booking charge `payment_transaction` becomes `APPROVED`
- `booking_financial_summary.amountPaid` is recomputed
- financial status moves to `PAID`

### On refund flow

When a booking action already created a refund target:

1. the domain persists `booking_action_decision`
2. Phase 4 creates `booking_refund_record`
3. Phase 5 attempts provider refund creation when there is a real approved charge

Then webhook events move the refund through:

- `PENDING_MANUAL` or `PENDING_PROVIDER`
- `COMPLETED`
- `FAILED`

And the summary is recalculated to:

- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `FAILED`

## Webhook processing

Current supported booking-relevant webhook outcomes:

- payment succeeded / settled
- payment failed
- refund succeeded
- refund partial
- refund failed

Processing flow:

1. signature verification per provider
2. parse to `ParsedWebhookEvent`
3. register in `payment_event` with duplicate protection
4. booking-aware processor tries to resolve:
   - booking
   - payment transaction
   - refund record
5. persist/update `payment_transaction`
6. recalculate `booking_financial_summary`
7. attach links on `payment_event`

Duplicate webhooks are ignored by the existing event ledger using the provider event id.

Late or out-of-order events are handled best-effort by:

- resolving booking from booking reference
- resolving refund from provider reference or `refund:{refundRecordId}` external reference
- recomputing the financial summary from persisted evidence instead of applying incremental math only

## Currency

Currency is now explicit in:

- `professional_service.currency`
- `booking.serviceCurrencySnapshot`
- `payment_transaction.currency`
- `booking_refund_record.currency`
- `booking_financial_summary.currency`

The booking snapshot remains the base default, but provider evidence can overwrite the summary currency if the external event carries it.

## New booking API surface

Added backend-only provider bootstrap for client prepaid bookings:

- `POST /cliente/reservas/{id}/payment-session`

This creates a booking checkout session and persists the external charge attempt.

## `/reservas/{id}/actions` note

`GET /reservas/{id}/actions` still evaluates cancel, reschedule and professional no-show.

`complete` is intentionally not exposed there in this phase because:

- it is an operational close action for the professional
- it does not have a user-facing financial preview
- keeping it outside the preview contract avoids mixing operational completion with customer decisioning

## Pending after this phase

- provider-specific retry / repair workflows
- webhook replay tooling and admin reconciliation endpoints
- support for additional providers in booking checkout/refund flows
- explicit settlement vs authorization distinctions if the provider exposes them
- richer partial-refund metadata
- batch reconciliation for missed webhooks

## Known limits

- booking provider integration is intentionally minimal and currently oriented to the provider already configured in the project
- if a local database already recorded the old duplicate Flyway versions from this branch history, manual Flyway repair may be needed before re-running migrations
- refund completion currently treats provider-confirmed partial refunds as completed refund records while the booking summary carries the partial outcome
