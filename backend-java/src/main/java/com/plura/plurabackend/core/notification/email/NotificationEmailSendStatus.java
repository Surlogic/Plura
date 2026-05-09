package com.plura.plurabackend.core.notification.email;

/**
 * NotificationEmailSendStatus es un enum de dominio del modulo notificaciones / email.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, email transaccional.
 */
public enum NotificationEmailSendStatus {
    SENT,
    FAILED_RETRYABLE,
    FAILED_PERMANENT
}
