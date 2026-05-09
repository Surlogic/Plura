package com.plura.plurabackend.core.booking.model;

/**
 * BookingOperationalStatus es un enum de dominio del modulo reservas / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: operaciones asincronicas, reservas.
 */
public enum BookingOperationalStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    COMPLETED,
    NO_SHOW
}
