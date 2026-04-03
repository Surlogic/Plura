package com.plura.plurabackend.core.billing.payments.provider;

import java.math.BigDecimal;

public record ProviderRefundRequest(
    String providerPaymentId,
    Long professionalId,
    String refundReference,
    BigDecimal amount,
    String currency,
    String reason,
    String webhookUrl
) {}
