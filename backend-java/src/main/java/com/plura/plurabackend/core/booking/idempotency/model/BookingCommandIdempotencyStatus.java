package com.plura.plurabackend.core.booking.idempotency.model;

public enum BookingCommandIdempotencyStatus {
    IN_PROGRESS,
    COMPLETED,
    FAILED
}
