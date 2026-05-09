package com.plura.plurabackend.core.billing.webhooks;

/**
 * WebhookEventType es un enum de dominio del modulo billing / webhooks.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: webhooks.
 */
public enum WebhookEventType {
    SUBSCRIPTION_PENDING,
    PAYMENT_SUCCEEDED,
    PAYMENT_FAILED,
    SUBSCRIPTION_CANCELLED,
    SUBSCRIPTION_RENEWED,
    PAYMENT_REFUNDED,
    REFUND_PARTIAL,
    REFUND_FAILED,
    PAYOUT_PENDING,
    PAYOUT_SUCCEEDED,
    PAYOUT_FAILED,
    UNKNOWN
}
