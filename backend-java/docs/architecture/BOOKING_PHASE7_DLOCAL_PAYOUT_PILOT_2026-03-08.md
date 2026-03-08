# Booking Phase 7: dLocal Booking Payout Pilot

## Scope

This phase closes the last operational leg of Model B for paid bookings:

- client charge
- customer refund
- professional payout / release

Provider scope for booking money movement in this phase:

- dLocal only

Mercado Pago remains outside the booking financial lifecycle.

## What changed

### Professional payout configuration

`professional_profile` now stores the minimum dLocal payout destination data required for a closed pilot:

- `dlocal_payout_enabled`
- `dlocal_payout_country`
- `dlocal_beneficiary_first_name`
- `dlocal_beneficiary_last_name`
- `dlocal_beneficiary_document_type`
- `dlocal_beneficiary_document_number`
- `dlocal_bank_code`
- `dlocal_bank_branch`
- `dlocal_bank_account_number`
- `dlocal_bank_account_type`

There is still no frontend onboarding for this. Pilot setup is manual / backoffice for now.

### Real payout initiation

When the booking domain creates a `booking_payout_record`, the provider integration now attempts to initiate a real dLocal payout.

Artifacts involved:

- `booking_action_decision`
- `booking_payout_record`
- `payment_transaction` with `BOOKING_PAYOUT`
- `payment_event`
- `booking_financial_summary`

### Payout retry

New operational endpoint:

- `POST /profesional/reservas/{id}/payout/retry`

Behavior:

- reuses the existing payout record
- does not create a new domain decision
- does not re-evaluate business rules
- avoids duplicate initiation when there is already a pending or successful payout transaction

## Current payout lifecycle

### 1. Domain decides release

Release eligibility still comes from booking domain:

- `COMPLETE` with held funds
- `NO_SHOW` with retain target
- `CANCEL` with retain target

### 2. Payout record is created

`booking_payout_record` is created as the operational release intent.

### 3. dLocal payout is initiated

`BookingProviderIntegrationService` builds a dLocal payout request from:

- booking
- payout record
- professional payout config

Then it creates:

- `payment_transaction.transactionType = BOOKING_PAYOUT`

### 4. Aggregate moves to release pending

`booking_financial_summary` reflects:

- `amountToRelease`
- `RELEASE_PENDING`

until payout evidence becomes terminal.

### 5. Webhook updates payout state

dLocal payout notifications are resolved by `external_id = payout:{payoutRecordId}` and/or provider payout id.

Current payout webhook outcomes:

- `PAYOUT_PENDING`
- `PAYOUT_SUCCEEDED`
- `PAYOUT_FAILED`

These update:

- `booking_payout_record`
- `payment_transaction`
- `payment_event`
- `booking_financial_summary`

## Operational runbook

### Payout initiated

Expected state:

- `booking_payout_record.status = PENDING_PROVIDER`
- latest `payment_transaction.status = PENDING`
- `booking_financial_summary.financialStatus = RELEASE_PENDING`

Check:

- payout record provider reference
- latest booking payout transaction payload
- matching `payment_event` if webhook already arrived

### Payout webhook received

Expected state on success:

- `booking_payout_record.status = COMPLETED`
- `payment_transaction.status = APPROVED` or `PARTIALLY_RELEASED`
- `booking_financial_summary.financialStatus = RELEASED` or `PARTIALLY_RELEASED`

Expected state on failure:

- `booking_payout_record.status = FAILED`
- `payment_transaction.status = FAILED`
- `booking_financial_summary.financialStatus = FAILED`

### Retry manual

Use:

- `POST /profesional/reservas/{id}/payout/retry`

Safe retry rules in this phase:

- if latest payout tx is `PENDING`, retry does not initiate a second payout
- if latest payout tx is already successful, retry returns current state
- if payout failed or never left `PENDING_MANUAL`, retry creates a new provider attempt for the same payout record

## Identifying stuck releases

Use `booking_financial_summary.financialStatus = RELEASE_PENDING` and `updatedAt` age to find bookings that need review.

The repository already supports querying summaries by status and age for simple operational checks.

## Known gaps after this phase

- dLocal payout pilot depends on manual professional payout configuration in the database
- no public/admin UI yet for payout setup
- no batch reconciliation job yet
- webhook signature/auth for dLocal payouts is reused from the existing dLocal webhook handling already present in the project
- partial payout is modeled, but the MVP does not expose special UX for it
