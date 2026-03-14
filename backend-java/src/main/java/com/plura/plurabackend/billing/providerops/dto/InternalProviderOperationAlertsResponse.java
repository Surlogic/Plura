package com.plura.plurabackend.billing.providerops.dto;

public record InternalProviderOperationAlertsResponse(
    InternalProviderOperationAlertResponse staleUncertain,
    InternalProviderOperationAlertResponse excessiveRetryable,
    InternalProviderOperationAlertResponse expiredLeases
) {}
