package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * BookingNotificationTimelineItemView es un modelo inmutable del modulo notificaciones / consultas.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, reservas.
 */
public record BookingNotificationTimelineItemView(
    String id,
    String eventUuid,
    NotificationEventType type,
    NotificationAggregateType aggregateType,
    String aggregateId,
    String sourceModule,
    String sourceAction,
    NotificationActorType actorType,
    String actorId,
    NotificationRecipientType recipientType,
    String recipientId,
    LocalDateTime occurredAt,
    LocalDateTime createdAt,
    Long bookingId,
    Map<String, Object> payload
) {}
