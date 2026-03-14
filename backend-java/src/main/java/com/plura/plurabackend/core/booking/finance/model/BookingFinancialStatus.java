package com.plura.plurabackend.core.booking.finance.model;

public enum BookingFinancialStatus {
    NOT_REQUIRED,
    PAYMENT_PENDING,
    HELD,
    REFUND_PENDING,
    PARTIALLY_REFUNDED,
    REFUNDED,
    RELEASE_PENDING,
    PARTIALLY_RELEASED,
    RELEASED,
    FAILED
}
