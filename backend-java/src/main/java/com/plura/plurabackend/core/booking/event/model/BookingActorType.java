package com.plura.plurabackend.core.booking.event.model;

/**
 * BookingActorType es un enum de dominio del modulo reservas / eventos / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingActorType {
    CLIENT,
    PROFESSIONAL,
    SYSTEM
}
