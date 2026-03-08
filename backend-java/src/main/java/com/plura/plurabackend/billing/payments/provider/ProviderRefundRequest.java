package com.plura.plurabackend.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderRefundRequest(
    String providerPaymentId,
    String refundReference,
    BigDecimal amount,
    String currency,
    String reason,
    String webhookUrl
) {}
