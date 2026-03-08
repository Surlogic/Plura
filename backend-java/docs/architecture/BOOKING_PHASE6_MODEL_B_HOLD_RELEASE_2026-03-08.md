# Booking Phase 6: Model B Hold / Refund / Release

## Why this change

Previous booking finance phases already had:

- real booking charges
- real booking refunds
- provider-backed evidence in `payment_transaction` and `payment_event`
- domain intent in `booking_action_decision`

But the aggregate still spoke mostly in terms of `paid` and `retained`.

Product Model B requires a clearer lifecycle:

1. client pays when booking
2. funds remain held by Plura
3. Plura decides refund to client or release to professional
4. professional does not receive funds immediately at booking time

This phase makes that lifecycle explicit without replacing the existing provider integration.

## What changed

### `booking_financial_summary`

The booking aggregate is now oriented to held funds:

- `amountCharged`
- `amountHeld`
- `amountToRefund`
- `amountRefunded`
- `amountToRelease`
- `amountReleased`
- `currency`
- `financialStatus`

Legacy `amount_paid` / `amount_retained` columns are left as historical compatibility data in the database, but runtime booking finance now uses the explicit hold/release fields.

### Financial statuses

Current booking financial states:

- `NOT_REQUIRED`
- `PAYMENT_PENDING`
- `HELD`
- `REFUND_PENDING`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `RELEASE_PENDING`
- `PARTIALLY_RELEASED`
- `RELEASED`
- `FAILED`

Important reinterpretation:

- old `PAID` => `HELD`
- old `RETAINED` => `HELD`

That mapping is intentional because under Model B retained money is still platform-held until it is explicitly released to the professional.

### `booking_payout_record`

Refund and release are now different concepts.

New record:

- `booking_payout_record`

Stored fields:

- booking id
- professional id
- target amount
- released amount
- currency
- status
- reason code
- provider
- provider reference
- payload JSON
- related decision id
- created / updated / executed / failed timestamps

This is the release counterpart of `booking_refund_record`.

### `payment_transaction`

External evidence stays centralized in one table.

New transaction type:

- `BOOKING_PAYOUT`

This keeps booking charge, booking refund and future professional release evidence in the same external-transactions layer.

## Current Model B behavior

### After successful charge

When booking charge is approved:

- `amountCharged` increases
- funds stay in `amountHeld`
- status becomes `HELD`

### If refund is required

When decision + policy requires refund:

- `booking_refund_record` is created
- `amountToRefund` increases
- status becomes `REFUND_PENDING`

When provider refund evidence is confirmed:

- `amountRefunded` increases
- `amountHeld` decreases
- status becomes `PARTIALLY_REFUNDED` or `REFUNDED`

### If money should go to the professional

When the held money becomes releasable:

- `booking_payout_record` is created
- `amountToRelease` increases
- status becomes `RELEASE_PENDING`

MVP release triggers implemented in this phase:

- `COMPLETE` with held funds
- `NO_SHOW` with retain target allowed by decision/policy
- `CANCEL` with retain target greater than zero

This means late-cancel retained money also has an explicit path to the professional instead of staying modeled as generic retention.

## Relationship with domain decision

This phase does not move business rules out of the booking domain.

The source of truth remains:

1. `booking_action_decision`
2. provider evidence in `payment_transaction` / `payment_event`
3. booking aggregate in `booking_financial_summary`

Rules are not recalculated in webhooks.

What changes is the interpretation of the money movement:

- refund => client-side return of held funds
- payout/release => professional-side release of held funds

## Provider gap

Current branch already supports real booking charge and real refund initiation with provider/webhooks.

Direct provider payout for bookings is not implemented yet in this branch.

What is ready now:

- explicit payout record
- explicit release amounts in the summary
- external evidence model prepared with `BOOKING_PAYOUT`

What remains for the next phase:

- provider payout initiation
- provider payout webhook mapping
- automatic transition from `RELEASE_PENDING` to `RELEASED`

Until that provider step exists, payout records remain the correct operational placeholder instead of overloading refund or generic retained states.

## Backfill strategy

The migration is intentionally conservative:

- booking summaries are backfilled to the new explicit fields
- old `PAID` / `RETAINED` rows are reinterpreted as `HELD`
- historic payouts are not fabricated retroactively

That means old bookings that previously looked `PAID/RETAINED` now appear as held funds until a future explicit release action or manual ops process handles them.
