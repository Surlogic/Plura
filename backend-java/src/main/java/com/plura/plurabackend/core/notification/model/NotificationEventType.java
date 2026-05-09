package com.plura.plurabackend.core.notification.model;

/**
 * NotificationEventType es un enum de dominio del modulo notificaciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones.
 */
public enum NotificationEventType {
    BOOKING_CREATED,
    BOOKING_CONFIRMED,
    BOOKING_CANCELLED,
    BOOKING_RESCHEDULED,
    BOOKING_COMPLETED,
    BOOKING_NO_SHOW,
    PAYMENT_APPROVED,
    PAYMENT_FAILED,
    PAYMENT_REFUND_PENDING,
    PAYMENT_REFUNDED,
    REVIEW_RECEIVED,
    POLICY_UPDATED,
    SCHEDULE_UPDATED
}
