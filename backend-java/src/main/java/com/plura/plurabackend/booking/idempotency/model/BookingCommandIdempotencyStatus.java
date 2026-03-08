package com.plura.plurabackend.booking.idempotency.model;

public enum BookingCommandIdempotencyStatus {
    IN_PROGRESS,
    COMPLETED,
    FAILED
}
