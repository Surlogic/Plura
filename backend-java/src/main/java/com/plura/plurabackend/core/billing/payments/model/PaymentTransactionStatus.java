package com.plura.plurabackend.core.billing.payments.model;

/**
 * PaymentTransactionStatus es un enum de dominio del modulo billing / pagos / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: pagos.
 */
public enum PaymentTransactionStatus {
    PENDING,
    APPROVED,
    PARTIALLY_REFUNDED,
    PARTIALLY_RELEASED,
    FAILED,
    CANCELLED,
    REFUNDED
}
