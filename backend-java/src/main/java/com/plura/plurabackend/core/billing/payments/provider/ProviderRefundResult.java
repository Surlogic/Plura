package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderRefundResult(
    String providerRefundId,
    String providerPaymentId,
    String status,
    BigDecimal amount,
    String currency,
    String rawResponseJson
) {}
