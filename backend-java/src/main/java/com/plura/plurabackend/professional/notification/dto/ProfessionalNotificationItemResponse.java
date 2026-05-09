package com.plura.plurabackend.professional.notification.dto;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;

/**
 * ProfessionalNotificationItemResponse es un modelo inmutable del modulo profesionales / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, notificaciones.
 */
public record ProfessionalNotificationItemResponse(
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
