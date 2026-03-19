package com.plura.plurabackend.core.billing.webhooks;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ParsedWebhookEvent(
    PaymentProvider provider,
    WebhookEventDomain domain,
    String providerEventId,
    String providerObjectId,
    WebhookEventType eventType,
    Long professionalId,
    Long bookingId,
    String providerSubscriptionId,
    String providerPaymentId,
    String orderReference,
    BigDecimal amount,
    String currency,
    String planCode,
    boolean cancelAtPeriodEnd,
    LocalDateTime eventTime,
    String payloadHash,
    String payloadJson
) {

    public ParsedWebhookEvent(
        PaymentProvider provider,
        String providerEventId,
        String providerObjectId,
        WebhookEventType eventType,
        Long professionalId,
        Long bookingId,
        String providerSubscriptionId,
        String providerPaymentId,
        String orderReference,
        BigDecimal amount,
        String currency,
        String planCode,
        boolean cancelAtPeriodEnd,
        LocalDateTime eventTime,
        String payloadHash,
        String payloadJson
    ) {
        this(
            provider,
            WebhookEventDomain.UNKNOWN,
            providerEventId,
            providerObjectId,
            eventType,
            professionalId,
            bookingId,
            providerSubscriptionId,
            providerPaymentId,
            orderReference,
            amount,
            currency,
            planCode,
            cancelAtPeriodEnd,
            eventTime,
            payloadHash,
            payloadJson
        );
    }
}
