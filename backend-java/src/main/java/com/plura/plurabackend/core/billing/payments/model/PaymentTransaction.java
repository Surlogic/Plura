package com.plura.plurabackend.core.billing.payments.model;

import com.plura.plurabackend.core.booking.finance.model.BookingRefundRecord;
import com.plura.plurabackend.core.booking.finance.model.BookingPayoutRecord;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(
    name = "payment_transaction",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_payment_transaction_provider_payment",
            columnNames = {"provider", "provider_payment_id"}
        )
    },
    indexes = {
        @Index(name = "idx_payment_transaction_professional", columnList = "professional_id"),
        @Index(name = "idx_payment_transaction_created_at", columnList = "created_at")
    }
)
public class PaymentTransaction {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "professional_id", nullable = false)
    private Long professionalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_record_id")
    private BookingRefundRecord refundRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_record_id")
    private BookingPayoutRecord payoutRecord;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private PaymentTransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentProvider provider;

    @Column(name = "provider_payment_id", length = 200)
    private String providerPaymentId;

    @Column(name = "provider_status", length = 80)
    private String providerStatus;

    @Column(name = "external_reference", length = 200)
    private String externalReference;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentTransactionStatus status;

    @Column(name = "payload_json", columnDefinition = "text")
    private String payloadJson;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "failed_at")
    private LocalDateTime failedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
        if (this.transactionType == null) {
            this.transactionType = PaymentTransactionType.SUBSCRIPTION_CHARGE;
        }
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
