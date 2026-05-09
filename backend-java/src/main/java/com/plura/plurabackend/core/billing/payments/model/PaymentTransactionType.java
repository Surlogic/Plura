package com.plura.plurabackend.core.billing.payments.model;

/**
 * PaymentTransactionType es un enum de dominio del modulo billing / pagos / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: pagos.
 */
public enum PaymentTransactionType {
    SUBSCRIPTION_CHARGE,
    BOOKING_CHARGE,
    BOOKING_REFUND,
    BOOKING_PAYOUT
}
