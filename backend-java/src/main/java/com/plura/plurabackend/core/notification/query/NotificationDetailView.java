package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * NotificationDetailView es un modelo inmutable del modulo notificaciones / consultas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationDetailView(
    String id,
    String notificationEventId,
    NotificationEventType type,
    NotificationAggregateType aggregateType,
    String aggregateId,
    String title,
    String body,
    NotificationSeverity severity,
    String category,
    String actionUrl,
    String actionLabel,
    LocalDateTime occurredAt,
    LocalDateTime createdAt,
    LocalDateTime readAt,
    LocalDateTime archivedAt,
    NotificationActorType actorType,
    String actorId,
    NotificationRecipientType recipientType,
    String recipientId,
    String sourceModule,
    String sourceAction,
    Long bookingId,
    Map<String, Object> payload
) {}
