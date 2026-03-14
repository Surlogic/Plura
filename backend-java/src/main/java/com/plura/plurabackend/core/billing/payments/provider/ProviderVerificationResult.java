package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderVerificationResult(
    boolean finalApproved,
    String status,
    BigDecimal amount,
    String currency,
    Long professionalId,
    String planCode,
    String providerObjectId
) {}
