package com.plura.plurabackend.billing.providerops.model;

import com.plura.plurabackend.billing.payments.model.PaymentProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(
    name = "provider_operation",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_provider_operation_type_reference",
            columnNames = {"operation_type", "external_reference"}
        )
    },
    indexes = {
        @Index(name = "idx_provider_operation_status_next_attempt", columnList = "status,next_attempt_at"),
        @Index(name = "idx_provider_operation_booking", columnList = "booking_id"),
        @Index(name = "idx_provider_operation_transaction", columnList = "payment_transaction_id")
    }
)
public class ProviderOperation {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 40)
    private ProviderOperationType operationType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProviderOperationStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentProvider provider;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "payment_transaction_id", length = 36)
    private String paymentTransactionId;

    @Column(name = "refund_record_id", length = 36)
    private String refundRecordId;

    @Column(name = "payout_record_id", length = 36)
    private String payoutRecordId;

    @Column(name = "external_reference", nullable = false, length = 200)
    private String externalReference;

    @Column(name = "provider_reference", length = 200)
    private String providerReference;

    @Column(name = "request_payload_json", columnDefinition = "text")
    private String requestPayloadJson;

    @Column(name = "response_payload_json", columnDefinition = "text")
    private String responsePayloadJson;

    @Column(name = "last_error", length = 1000)
    private String lastError;

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

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (attemptCount == null) {
            attemptCount = 0;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
        if (nextAttemptAt == null) {
            nextAttemptAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
