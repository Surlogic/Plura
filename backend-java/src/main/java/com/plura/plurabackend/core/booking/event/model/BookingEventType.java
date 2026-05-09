package com.plura.plurabackend.core.booking.event.model;

/**
 * BookingEventType es un enum de dominio del modulo reservas / eventos / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingEventType {
    BOOKING_CREATED,
    BOOKING_CONFIRMED,
    BOOKING_CANCELLED,
    BOOKING_RESCHEDULED,
    BOOKING_COMPLETED,
    BOOKING_NO_SHOW_MARKED,
    BOOKING_FINANCIAL_RECOMPUTED,
    BOOKING_FINANCIAL_RECONCILED,
    BOOKING_REFUND_RETRY_REQUESTED,
    BOOKING_PAYOUT_RETRY_REQUESTED
}
