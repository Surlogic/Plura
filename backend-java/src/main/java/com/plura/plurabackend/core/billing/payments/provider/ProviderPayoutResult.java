package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderPayoutResult(
    String providerPayoutId,
    String status,
    BigDecimal amount,
    String currency,
    String rawResponseJson
) {}
