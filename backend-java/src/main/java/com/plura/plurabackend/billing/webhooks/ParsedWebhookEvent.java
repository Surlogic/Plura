package com.plura.plurabackend.billing.webhooks;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ParsedWebhookEvent(
    PaymentProvider provider,
    String providerEventId,
    String providerObjectId,
    WebhookEventType eventType,
    Long professionalId,
    String providerSubscriptionId,
    String providerPaymentId,
    BigDecimal amount,
    String currency,
    String planCode,
    boolean cancelAtPeriodEnd,
    LocalDateTime eventTime,
    String payloadHash,
    String payloadJson
) {}
