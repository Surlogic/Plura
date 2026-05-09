package com.plura.plurabackend.core.notification.model;

/**
 * NotificationSeverity es un enum de dominio del modulo notificaciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones.
 */
public enum NotificationSeverity {
    INFO,
    SUCCESS,
    WARNING,
    ERROR
}
