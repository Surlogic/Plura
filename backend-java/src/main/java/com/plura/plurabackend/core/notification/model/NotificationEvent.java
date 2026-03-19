package com.plura.plurabackend.core.notification.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "notification_event",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_notification_event_event_uuid", columnNames = {"event_uuid"}),
        @UniqueConstraint(name = "uq_notification_event_dedupe_key", columnNames = {"dedupe_key"})
    },
    indexes = {
        @Index(name = "idx_notification_event_recipient_created", columnList = "recipient_type, recipient_id, created_at"),
        @Index(name = "idx_notification_event_aggregate", columnList = "aggregate_type, aggregate_id"),
        @Index(name = "idx_notification_event_occurred", columnList = "occurred_at"),
        @Index(name = "idx_notification_event_booking_ref", columnList = "recipient_type, recipient_id, booking_reference_id, occurred_at")
    }
)
public class NotificationEvent {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "event_uuid", nullable = false, length = 36)
    private String eventUuid;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 60)
    private NotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregate_type", nullable = false, length = 60)
    private NotificationAggregateType aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 120)
    private String aggregateId;

    @Column(name = "source_module", nullable = false, length = 80)
    private String sourceModule;

    @Column(name = "source_action", nullable = false, length = 80)
    private String sourceAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_type", nullable = false, length = 30)
    private NotificationRecipientType recipientType;

    @Column(name = "recipient_id", nullable = false, length = 120)
    private String recipientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", length = 30)
    private NotificationActorType actorType;

    @Column(name = "actor_id", length = 120)
    private String actorId;

    @Column(name = "booking_reference_id")
    private Long bookingReferenceId;

    @Column(name = "payload_json", columnDefinition = "text")
    private String payloadJson;

    @Column(name = "dedupe_key", length = 200)
    private String dedupeKey;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (eventUuid == null || eventUuid.isBlank()) {
            eventUuid = UUID.randomUUID().toString();
        }
        if (occurredAt == null) {
            occurredAt = LocalDateTime.now();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
