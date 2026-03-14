package com.plura.plurabackend.core.booking.finance.model;

import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking_payout_record")
public class BookingPayoutRecord {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "professional_id", nullable = false)
    private Long professionalId;

    @Column(name = "target_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "released_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal releasedAmount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BookingPayoutStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, length = 40)
    private BookingPayoutReasonCode reasonCode;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PaymentProvider provider;

    @Column(name = "provider_reference", length = 200)
    private String providerReference;

    @Column(name = "payload_json", columnDefinition = "text")
    private String payloadJson;

    @Column(name = "related_decision_id", length = 36)
    private String relatedDecisionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
        }
        if (targetAmount == null) {
            targetAmount = BigDecimal.ZERO;
        }
        if (releasedAmount == null) {
            releasedAmount = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "UYU";
        }
        if (status == null) {
            status = BookingPayoutStatus.PENDING_MANUAL;
        }
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
