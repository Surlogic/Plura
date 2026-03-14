# Reviews V1 Spec

## Scope

Implement two backend capabilities:

- Base review from client: rating plus text.
- Business reply to a review.

This document defines the business rules for V1 before adding schema, entities, services, or endpoints.

## Core Decisions

1. A review belongs to exactly one completed booking.
2. A booking can have at most one review.
3. Only the client who owns the booking can create the review.
4. Only bookings in `COMPLETED` status are reviewable.
5. Review creation requires:
   - `rating` integer from 1 to 5
   - `text` non-empty trimmed string
6. A business reply belongs to exactly one review.
7. Only the professional who owns the reviewed booking can create or update the business reply.
8. V1 does not support client-side edit or delete of published reviews.
9. V1 allows the professional to create or update the business reply.
10. Public profile data exposes review content and business reply, but never sensitive client data.

## Review Eligibility

A client can create a review only if all conditions are true:

1. The request is authenticated as `ROLE_USER`.
2. The booking exists.
3. The booking belongs to the authenticated client.
4. The booking status is `COMPLETED`.
5. No review already exists for that booking.

If any condition fails, the backend must reject the request with a clear HTTP error.

## Business Reply Eligibility

A professional can reply only if all conditions are true:

1. The request is authenticated as `ROLE_PROFESSIONAL`.
2. The review exists.
3. The review belongs to a booking owned by the authenticated professional.
4. The reply text is non-empty after trimming.

V1 behavior:

- First reply creates the response payload.
- Later replies from the same business overwrite the previous reply and refresh reply timestamps.

## Public Exposure Rules

Public endpoints may expose:

- rating
- review text
- review creation timestamp
- business reply text
- business reply timestamp

Public endpoints must not expose:

- client email
- client phone
- internal user ids unless strictly needed for private backend flows

For client identity in public payloads, V1 should use a safe display format such as:

- first name plus initial, or
- masked full name

## Aggregated Rating Rules

`professional_profile.rating` and `professional_profile.reviews_count` remain the source for search and listing projections.

When a review is created:

1. Recalculate average rating for the professional.
2. Recalculate total reviews count for the professional.
3. Persist both values on `professional_profile` inside the same business transaction when possible.

Business replies do not change rating aggregates.

## V1 API Shape

Planned endpoint families:

- Client create review under `/cliente/**`
- Professional create or update reply under `/profesional/**`
- Public review reads under `/public/**`

Concrete routes will be defined in step 2 with schema and DTO design.

## Expected Error Semantics

- `401 Unauthorized`: no valid session
- `403 Forbidden`: authenticated user does not own the target resource
- `404 Not Found`: booking or review does not exist
- `409 Conflict`: duplicate review for the same booking
- `400 Bad Request`: invalid payload such as out-of-range rating or blank text

## Out Of Scope For V1

- Review moderation
- Review reporting and abuse workflows
- Client edit review
- Client delete review
- Multiple business replies per review
- Reactions, likes, or threaded comments
- Rich media attachments on reviews

## Implementation Impact

The rest of the implementation should follow these rules in order:

1. Database migration and persistence model
2. Review creation service for client bookings
3. Business reply service for professionals
4. Public read models and endpoints
5. Aggregate rating refresh
6. Integration tests