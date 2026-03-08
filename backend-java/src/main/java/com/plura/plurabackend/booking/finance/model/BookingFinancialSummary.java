package com.plura.plurabackend.booking.finance.model;

import com.plura.plurabackend.booking.model.Booking;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking_financial_summary")
public class BookingFinancialSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(name = "amount_charged", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountCharged;

    @Column(name = "amount_held", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountHeld;

    @Column(name = "amount_to_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountToRefund;

    @Column(name = "amount_refunded", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountRefunded;

    @Column(name = "amount_to_release", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountToRelease;

    @Column(name = "amount_released", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountReleased;

    @Column(nullable = false, length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "financial_status", nullable = false, length = 30)
    private BookingFinancialStatus financialStatus;

    @Column(name = "last_decision_id", length = 36)
    private String lastDecisionId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (amountCharged == null) {
            amountCharged = BigDecimal.ZERO;
        }
        if (amountHeld == null) {
            amountHeld = BigDecimal.ZERO;
        }
        if (amountToRefund == null) {
            amountToRefund = BigDecimal.ZERO;
        }
        if (amountRefunded == null) {
            amountRefunded = BigDecimal.ZERO;
        }
        if (amountToRelease == null) {
            amountToRelease = BigDecimal.ZERO;
        }
        if (amountReleased == null) {
            amountReleased = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "UYU";
        }
        if (financialStatus == null) {
            financialStatus = BookingFinancialStatus.NOT_REQUIRED;
        }
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (version == null) {
            version = 0L;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
