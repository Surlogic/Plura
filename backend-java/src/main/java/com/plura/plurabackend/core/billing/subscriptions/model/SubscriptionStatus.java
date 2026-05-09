package com.plura.plurabackend.core.billing.subscriptions.model;

/**
 * SubscriptionStatus es un enum de dominio del modulo billing / suscripciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: suscripciones.
 */
public enum SubscriptionStatus {
    TRIAL,
    ACTIVE,
    PAST_DUE,
    CANCELLED
}
