package com.plura.plurabackend.core.notification.application;

/**
 * NotificationRegistrationResult es un modelo inmutable del modulo notificaciones / aplicacion.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationRegistrationResult(
    String notificationEventId,
    String eventUuid,
    boolean created
) {}
