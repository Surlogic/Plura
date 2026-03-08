package com.plura.plurabackend.booking.decision.model;

import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
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
@Table(name = "booking_action_decision")
public class BookingActionDecision {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 20)
    private BookingActionType actionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private BookingActorType actorType;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_before", nullable = false, length = 20)
    private BookingOperationalStatus statusBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after", nullable = false, length = 20)
    private BookingOperationalStatus statusAfter;

    @Column(name = "refund_preview_amount", precision = 12, scale = 2)
    private BigDecimal refundPreviewAmount;

    @Column(name = "retain_preview_amount", precision = 12, scale = 2)
    private BigDecimal retainPreviewAmount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "financial_outcome_code", nullable = false, length = 40)
    private String financialOutcomeCode;

    @Column(name = "reason_codes_json", columnDefinition = "text")
    private String reasonCodesJson;

    @Column(name = "message_code", length = 120)
    private String messageCode;

    @Column(name = "message_params_json", columnDefinition = "text")
    private String messageParamsJson;

    @Column(name = "plain_text_fallback", columnDefinition = "text")
    private String plainTextFallback;

    @Column(name = "decision_snapshot_json", columnDefinition = "text")
    private String decisionSnapshotJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.currency == null || this.currency.isBlank()) {
            this.currency = "UYU";
        }
        if (this.financialOutcomeCode == null || this.financialOutcomeCode.isBlank()) {
            this.financialOutcomeCode = "NO_FINANCIAL_ACTION";
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
