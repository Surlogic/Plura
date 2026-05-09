package com.plura.plurabackend.core.notification.application;

import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * NotificationRecordCommand es un modelo inmutable del modulo notificaciones / aplicacion.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones.
 */
public record NotificationRecordCommand(
    NotificationEventType eventType,
    NotificationAggregateType aggregateType,
    String aggregateId,
    String sourceModule,
    String sourceAction,
    NotificationRecipientType recipientType,
    String recipientId,
    NotificationActorType actorType,
    String actorId,
    Long bookingReferenceId,
    Map<String, Object> payload,
    String dedupeKey,
    LocalDateTime occurredAt,
    NotificationInAppProjectionCommand inAppProjection,
    NotificationEmailProjectionCommand emailProjection
) {

    public NotificationRecordCommand {
        payload = payload == null ? Map.of() : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(payload));
    }
}
