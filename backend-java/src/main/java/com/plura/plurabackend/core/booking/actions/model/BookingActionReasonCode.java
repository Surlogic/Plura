package com.plura.plurabackend.core.booking.actions.model;

/**
 * BookingActionReasonCode es un enum de dominio del modulo reservas / acciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: reservas.
 */
public enum BookingActionReasonCode {
    RESERVATION_NOT_FOUND,
    ACTOR_NOT_ALLOWED,
    BOOKING_NOT_ACTIVE,
    BOOKING_ALREADY_STARTED,
    CLIENT_CANCELLATION_DISABLED,
    CLIENT_RESCHEDULE_DISABLED,
    FREE_CANCELLATION_WINDOW_OPEN,
    LATE_CANCELLATION_PENALTY_APPLIES,
    LATE_CANCELLATION_POLICY_APPLIES,
    RESCHEDULE_WINDOW_OPEN,
    RESCHEDULE_WINDOW_CLOSED,
    RESCHEDULE_LIMIT_REACHED,
    PROFESSIONAL_CAN_MARK_COMPLETED,
    PROFESSIONAL_CAN_MARK_NO_SHOW,
    NO_SHOW_ONLY_AFTER_START,
    PROFESSIONAL_CANCELLATION_FULL_REFUND,
    POLICY_SNAPSHOT_FALLBACK,
    NO_PREPAID_AMOUNT,
    NO_SHOW_MARKED_MANUALLY,
    BOOKING_COMPLETED_MANUALLY
}
