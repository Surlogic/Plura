package com.plura.plurabackend.core.booking.finance.model;

/**
 * BookingFinancialStatus es un enum de dominio del modulo reservas / finanzas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingFinancialStatus {
    NOT_REQUIRED,
    PAYMENT_PENDING,
    HELD,
    REFUND_PENDING,
    PARTIALLY_REFUNDED,
    REFUNDED,
    RELEASE_PENDING,
    PARTIALLY_RELEASED,
    RELEASED,
    FAILED
}
