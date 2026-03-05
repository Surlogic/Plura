package com.plura.plurabackend.billing.payments.provider;

import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import java.math.BigDecimal;

public record ProviderCheckoutRequest(
    String subscriptionId,
    Long professionalId,
    SubscriptionPlan plan,
    BigDecimal amount,
    String currency,
    String customerEmail,
    String customerName,
    String webhookUrl
) {}
