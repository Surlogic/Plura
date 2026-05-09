package com.plura.plurabackend.core.booking.idempotency.model;

/**
 * BookingCommandIdempotencyStatus es un enum de dominio del modulo reservas / idempotencia / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingCommandIdempotencyStatus {
    IN_PROGRESS,
    COMPLETED,
    FAILED
}
