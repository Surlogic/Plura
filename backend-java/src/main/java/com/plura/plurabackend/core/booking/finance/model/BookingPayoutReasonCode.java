package com.plura.plurabackend.core.booking.finance.model;

/**
 * BookingPayoutReasonCode es un enum de dominio del modulo reservas / finanzas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingPayoutReasonCode {
    BOOKING_COMPLETED,
    CLIENT_NO_SHOW,
    CLIENT_LATE_CANCELLATION,
    OTHER
}
