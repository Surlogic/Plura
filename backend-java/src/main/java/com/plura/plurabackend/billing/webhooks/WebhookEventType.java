package com.plura.plurabackend.billing.webhooks;

public enum WebhookEventType {
    PAYMENT_SUCCEEDED,
    PAYMENT_FAILED,
    SUBSCRIPTION_CANCELLED,
    SUBSCRIPTION_RENEWED,
    PAYMENT_REFUNDED,
    UNKNOWN
}
