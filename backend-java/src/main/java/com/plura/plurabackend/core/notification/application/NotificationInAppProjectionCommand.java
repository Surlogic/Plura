package com.plura.plurabackend.core.notification.application;

import com.plura.plurabackend.core.notification.model.NotificationSeverity;

/**
 * NotificationInAppProjectionCommand es un modelo inmutable del modulo notificaciones / aplicacion.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationInAppProjectionCommand(
    String title,
    String body,
    NotificationSeverity severity,
    String category,
    String actionUrl,
    String actionLabel
) {}
