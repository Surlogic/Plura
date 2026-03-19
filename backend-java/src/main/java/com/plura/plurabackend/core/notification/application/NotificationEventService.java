package com.plura.plurabackend.core.notification.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.dedup.NotificationDedupeService;
import com.plura.plurabackend.core.notification.metrics.NotificationMetricsService;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.model.NotificationAggregateType;
import com.plura.plurabackend.core.notification.repository.NotificationEventRepository;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationEventService {

    private final NotificationEventRepository notificationEventRepository;
    private final NotificationDedupeService notificationDedupeService;
    private final ObjectMapper objectMapper;
    private final NotificationMetricsService notificationMetricsService;

    public NotificationEventService(
        NotificationEventRepository notificationEventRepository,
        NotificationDedupeService notificationDedupeService,
        ObjectMapper objectMapper,
        NotificationMetricsService notificationMetricsService
    ) {
        this.notificationEventRepository = notificationEventRepository;
        this.notificationDedupeService = notificationDedupeService;
        this.objectMapper = objectMapper;
        this.notificationMetricsService = notificationMetricsService;
    }

    @Transactional
    public NotificationEventRegistration recordCanonicalEvent(NotificationRecordCommand command) {
        validate(command);

        String dedupeKey = notificationDedupeService.normalize(command.dedupeKey());
        NotificationEvent existing = notificationDedupeService.findExisting(dedupeKey).orElse(null);
        if (existing != null) {
            notificationMetricsService.recordNotificationDeduplicated(command.eventType(), command.sourceModule());
            return new NotificationEventRegistration(existing, false);
        }

        NotificationEvent event = new NotificationEvent();
        event.setEventType(command.eventType());
        event.setAggregateType(command.aggregateType());
        event.setAggregateId(command.aggregateId().trim());
        event.setSourceModule(command.sourceModule().trim());
        event.setSourceAction(command.sourceAction().trim());
        event.setRecipientType(command.recipientType());
        event.setRecipientId(command.recipientId().trim());
        event.setActorType(command.actorType());
        event.setActorId(normalizeOptional(command.actorId()));
        event.setBookingReferenceId(resolveBookingReferenceId(command));
        event.setPayloadJson(writeJson(command.payload()));
        event.setDedupeKey(dedupeKey);
        event.setOccurredAt(command.occurredAt());

        try {
            NotificationEvent saved = notificationEventRepository.saveAndFlush(event);
            notificationMetricsService.recordNotificationCreated(saved);
            return new NotificationEventRegistration(saved, true);
        } catch (DataIntegrityViolationException exception) {
            if (dedupeKey == null) {
                throw exception;
            }
            NotificationEvent recovered = notificationEventRepository.findByDedupeKey(dedupeKey)
                .orElseThrow(() -> exception);
            notificationMetricsService.recordNotificationDeduplicated(command.eventType(), command.sourceModule());
            return new NotificationEventRegistration(recovered, false);
        }
    }

    private void validate(NotificationRecordCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("NotificationRecordCommand es obligatorio");
        }
        if (command.eventType() == null) {
            throw new IllegalArgumentException("eventType es obligatorio");
        }
        if (command.aggregateType() == null) {
            throw new IllegalArgumentException("aggregateType es obligatorio");
        }
        if (isBlank(command.aggregateId())) {
            throw new IllegalArgumentException("aggregateId es obligatorio");
        }
        if (isBlank(command.sourceModule())) {
            throw new IllegalArgumentException("sourceModule es obligatorio");
        }
        if (isBlank(command.sourceAction())) {
            throw new IllegalArgumentException("sourceAction es obligatorio");
        }
        if (command.recipientType() == null) {
            throw new IllegalArgumentException("recipientType es obligatorio");
        }
        if (isBlank(command.recipientId())) {
            throw new IllegalArgumentException("recipientId es obligatorio");
        }
    }

    private String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo serializar payload de notificacion", exception);
        }
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private Long resolveBookingReferenceId(NotificationRecordCommand command) {
        if (command.bookingReferenceId() != null) {
            return command.bookingReferenceId();
        }
        if (command.aggregateType() == NotificationAggregateType.BOOKING) {
            return parseLong(command.aggregateId());
        }
        if (command.payload() == null || command.payload().isEmpty()) {
            return null;
        }
        return parseLong(command.payload().get("bookingId"));
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

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    public record NotificationEventRegistration(NotificationEvent event, boolean created) {}
}
