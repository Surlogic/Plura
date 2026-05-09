package com.plura.plurabackend.core.booking.decision.model;

/**
 * BookingActionType es un enum de dominio del modulo reservas / decisiones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingActionType {
    CANCEL,
    RESCHEDULE,
    NO_SHOW,
    COMPLETE,
    RETRY_PAYOUT
}
