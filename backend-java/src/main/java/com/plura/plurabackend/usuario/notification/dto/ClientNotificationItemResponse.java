package com.plura.plurabackend.usuario.notification.dto;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;

/**
 * ClientNotificationItemResponse es un modelo inmutable del modulo cliente / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, clientes.
 */
public record ClientNotificationItemResponse(
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
