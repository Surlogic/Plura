package com.plura.plurabackend.core.notification.model;

public enum EmailDispatchStatus {
    PENDING,
    PROCESSING,
    RETRY_SCHEDULED,
    SENT,
    FAILED,
    CANCELLED
}
