package com.plura.plurabackend.core.notification.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
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
    name = "email_dispatch",
    indexes = {
        @Index(name = "idx_email_dispatch_status_due", columnList = "status, next_attempt_at, lease_until")
    }
)
public class EmailDispatch {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_event_id", nullable = false, unique = true)
    private NotificationEvent notificationEvent;

    @Column(name = "recipient_email", nullable = false, length = 320)
    private String recipientEmail;

    @Column(name = "template_key", nullable = false, length = 120)
    private String templateKey;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(name = "payload_json", columnDefinition = "text")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmailDispatchStatus status;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "locked_by", length = 120)
    private String lockedBy;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    @Column(name = "lease_until")
    private LocalDateTime leaseUntil;

    @Column(name = "provider_message_id", length = 200)
    private String providerMessageId;

    @Column(name = "error_code", length = 80)
    private String errorCode;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (status == null) {
            status = EmailDispatchStatus.PENDING;
        }
        if (attemptCount == null) {
            attemptCount = 0;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
