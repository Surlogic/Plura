package com.plura.plurabackend.core.billing.payments.provider;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import java.math.BigDecimal;

public record ProviderCheckoutRequest(
    String subscriptionId,
    Long professionalId,
    SubscriptionPlanCode plan,
    BigDecimal amount,
    String currency,
    String customerEmail,
    String customerName,
    String webhookUrl
) {}
