package com.plura.plurabackend.core.billing.providerops.model;

public enum ProviderOperationStatus {
    PENDING,
    PROCESSING,
    SUCCEEDED,
    RETRYABLE,
    FAILED,
    UNCERTAIN
}
