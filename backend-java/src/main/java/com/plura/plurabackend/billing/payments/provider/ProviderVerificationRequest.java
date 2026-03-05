package com.plura.plurabackend.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderVerificationRequest(
    String providerPaymentId,
    String providerSubscriptionId,
    BigDecimal expectedAmount,
    String expectedCurrency,
    Long expectedProfessionalId
) {}
