package com.plura.plurabackend.professional.notification.dto;

import com.plura.plurabackend.core.notification.model.NotificationActorType;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Map;

public record ProfessionalNotificationTimelineItemResponse(
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
