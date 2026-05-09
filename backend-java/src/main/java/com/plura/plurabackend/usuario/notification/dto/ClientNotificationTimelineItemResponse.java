package com.plura.plurabackend.usuario.notification.dto;

import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * ClientNotificationTimelineItemResponse es un modelo inmutable del modulo cliente / notificaciones / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, clientes.
 */
public record ClientNotificationTimelineItemResponse(
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
