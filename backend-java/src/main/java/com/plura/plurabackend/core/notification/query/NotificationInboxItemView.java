package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;

/**
 * NotificationInboxItemView es un modelo inmutable del modulo notificaciones / consultas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationInboxItemView(
    String id,
    NotificationEventType type,
    String title,
    String body,
    NotificationSeverity severity,
    String category,
    LocalDateTime createdAt,
    LocalDateTime readAt,
    Long bookingId,
    String actionUrl
) {}
