package com.plura.plurabackend.core.billing.payments.model;

public enum PaymentTransactionStatus {
    PENDING,
    APPROVED,
    PARTIALLY_REFUNDED,
    PARTIALLY_RELEASED,
    FAILED,
    CANCELLED,
    REFUNDED
}
