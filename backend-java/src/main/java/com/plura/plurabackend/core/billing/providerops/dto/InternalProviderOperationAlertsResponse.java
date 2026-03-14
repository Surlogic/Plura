package com.plura.plurabackend.core.billing.providerops.dto;

public record InternalProviderOperationAlertsResponse(
    InternalProviderOperationAlertResponse staleUncertain,
    InternalProviderOperationAlertResponse excessiveRetryable,
    InternalProviderOperationAlertResponse expiredLeases
) {}
