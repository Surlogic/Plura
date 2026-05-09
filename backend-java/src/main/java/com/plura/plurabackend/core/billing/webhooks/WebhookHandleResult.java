package com.plura.plurabackend.core.billing.webhooks;

/**
 * WebhookHandleResult es un enum de dominio del modulo billing / webhooks.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: webhooks.
 */
public enum WebhookHandleResult {
    PROCESSED,
    DUPLICATE,
    IGNORED
}
