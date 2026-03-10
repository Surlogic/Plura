package com.plura.plurabackend.billing.providerops.model;

public enum ProviderOperationStatus {
    PENDING,
    PROCESSING,
    SUCCEEDED,
    RETRYABLE,
    FAILED,
    UNCERTAIN
}
