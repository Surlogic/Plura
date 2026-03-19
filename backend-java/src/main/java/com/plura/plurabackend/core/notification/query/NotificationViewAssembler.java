package com.plura.plurabackend.core.notification.query;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class NotificationViewAssembler {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;

    NotificationViewAssembler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    NotificationInboxItemView toInboxItem(AppNotification notification) {
        NotificationEvent event = notification.getNotificationEvent();
        Map<String, Object> payload = readPayload(event);
        return new NotificationInboxItemView(
            notification.getId(),
            event.getEventType(),
            notification.getTitle(),
            notification.getBody(),
            notification.getSeverity(),
            notification.getCategory(),
            notification.getCreatedAt(),
            notification.getReadAt(),
            resolveBookingId(event, payload),
            notification.getActionUrl()
        );
    }

    NotificationDetailView toDetail(AppNotification notification) {
        NotificationEvent event = notification.getNotificationEvent();
        Map<String, Object> payload = readPayload(event);
        return new NotificationDetailView(
            notification.getId(),
            event.getId(),
            event.getEventType(),
            event.getAggregateType(),
            event.getAggregateId(),
            notification.getTitle(),
            notification.getBody(),
            notification.getSeverity(),
            notification.getCategory(),
            notification.getActionUrl(),
            notification.getActionLabel(),
            event.getOccurredAt(),
            notification.getCreatedAt(),
            notification.getReadAt(),
            notification.getArchivedAt(),
            event.getActorType(),
            event.getActorId(),
            notification.getRecipientType(),
            notification.getRecipientId(),
            event.getSourceModule(),
            event.getSourceAction(),
            resolveBookingId(event, payload),
            payload
        );
    }

    BookingNotificationTimelineItemView toTimelineItem(NotificationEvent event) {
        Map<String, Object> payload = readPayload(event);
        return new BookingNotificationTimelineItemView(
            event.getId(),
            event.getEventUuid(),
            event.getEventType(),
            event.getAggregateType(),
            event.getAggregateId(),
            event.getSourceModule(),
            event.getSourceAction(),
            event.getActorType(),
            event.getActorId(),
            event.getRecipientType(),
            event.getRecipientId(),
            event.getOccurredAt(),
            event.getCreatedAt(),
            resolveBookingId(event, payload),
            payload
        );
    }

    private Map<String, Object> readPayload(NotificationEvent event) {
        if (event == null || event.getPayloadJson() == null || event.getPayloadJson().isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(event.getPayloadJson(), MAP_TYPE);
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo leer payload de notification_event", exception);
        }
    }

    private Long resolveBookingId(NotificationEvent event, Map<String, Object> payload) {
        if (event != null && event.getBookingReferenceId() != null) {
            return event.getBookingReferenceId();
        }
        if (event != null && event.getAggregateType() == NotificationAggregateType.BOOKING) {
            Long aggregateBookingId = parseLong(event.getAggregateId());
            if (aggregateBookingId != null) {
                return aggregateBookingId;
            }
        }
        return parseLong(payload.get("bookingId"));
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.valueOf(value.toString().trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
