package com.plura.plurabackend.core.booking.model;

import com.plura.plurabackend.core.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @jakarta.persistence.ManyToOne(fetch = jakarta.persistence.FetchType.LAZY, optional = false)
    @jakarta.persistence.JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "professional_id", nullable = false)
    private Long professionalId;

    @Column(name = "worker_id")
    private Long workerId;

    @Column(name = "service_id", nullable = false)
    private String serviceId;

    @Column(name = "start_date_time", nullable = false)
    private LocalDateTime startDateTime;

    @Column(name = "start_date_time_utc")
    private Instant startDateTimeUtc;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BookingOperationalStatus operationalStatus;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Column(name = "reschedule_count", nullable = false)
    private Integer rescheduleCount;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "no_show_marked_at")
    private LocalDateTime noShowMarkedAt;

    @Column(name = "service_name_snapshot", nullable = false, length = 120)
    private String serviceNameSnapshot;

    @Column(name = "professional_slug_snapshot")
    private String professionalSlugSnapshot;

    @Column(name = "professional_display_name_snapshot")
    private String professionalDisplayNameSnapshot;

    @Column(name = "professional_location_snapshot")
    private String professionalLocationSnapshot;

    @Column(name = "worker_name_snapshot")
    private String workerNameSnapshot;

    @Column(name = "worker_email_snapshot")
    private String workerEmailSnapshot;

    @Column(name = "service_price_snapshot", precision = 12, scale = 2)
    private BigDecimal servicePriceSnapshot;

    @Column(name = "service_category_slug_snapshot", length = 120)
    private String serviceCategorySlugSnapshot;

    @Column(name = "service_category_name_snapshot", length = 120)
    private String serviceCategoryNameSnapshot;

    @Column(name = "service_deposit_amount_snapshot", precision = 12, scale = 2)
    private BigDecimal serviceDepositAmountSnapshot;

    @Column(name = "prepaid_processing_fee_amount_snapshot", precision = 12, scale = 2)
    private BigDecimal prepaidProcessingFeeAmountSnapshot;

    @Column(name = "prepaid_total_amount_snapshot", precision = 12, scale = 2)
    private BigDecimal prepaidTotalAmountSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "prepaid_processing_fee_mode_snapshot", nullable = false, length = 32)
    private BookingProcessingFeeMode prepaidProcessingFeeModeSnapshot;

    @Column(name = "service_currency_snapshot", nullable = false, length = 10)
    private String serviceCurrencySnapshot;

    @Column(name = "service_duration_snapshot", nullable = false, length = 40)
    private String serviceDurationSnapshot;

    @Column(name = "service_post_buffer_minutes_snapshot", nullable = false)
    private Integer servicePostBufferMinutesSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_payment_type_snapshot", nullable = false, length = 20)
    private ServicePaymentType servicePaymentTypeSnapshot;

    @Column(name = "professional_rubro_snapshot", length = 255)
    private String professionalRubroSnapshot;

    @Column(name = "professional_city_snapshot", length = 255)
    private String professionalCitySnapshot;

    @Column(name = "professional_country_snapshot", length = 255)
    private String professionalCountrySnapshot;

    @Column(name = "source_platform_snapshot", length = 20)
    private String sourcePlatformSnapshot;

    @Column(name = "policy_snapshot_json", columnDefinition = "text")
    private String policySnapshotJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.operationalStatus == null) {
            this.operationalStatus = BookingOperationalStatus.PENDING;
        }
        if (this.timezone == null || this.timezone.isBlank()) {
            this.timezone = "America/Montevideo";
        }
        if (this.startDateTimeUtc == null && this.startDateTime != null) {
            try {
                this.startDateTimeUtc = this.startDateTime.atZone(java.time.ZoneId.of(this.timezone)).toInstant();
            } catch (Exception ignored) {
                this.timezone = "America/Montevideo";
                this.startDateTimeUtc = this.startDateTime.atZone(java.time.ZoneId.of(this.timezone)).toInstant();
            }
        }
        if (this.rescheduleCount == null) {
            this.rescheduleCount = 0;
        }
        if (this.servicePostBufferMinutesSnapshot == null) {
            this.servicePostBufferMinutesSnapshot = 0;
        }
        if (this.servicePaymentTypeSnapshot == null) {
            this.servicePaymentTypeSnapshot = ServicePaymentType.ON_SITE;
        }
        if (this.prepaidProcessingFeeModeSnapshot == null) {
            this.prepaidProcessingFeeModeSnapshot = BookingProcessingFeeMode.INSTANT;
        }
        if (this.serviceCurrencySnapshot == null || this.serviceCurrencySnapshot.isBlank()) {
            this.serviceCurrencySnapshot = "UYU";
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    public void applyOperationalStatus(BookingOperationalStatus nextStatus, LocalDateTime changedAt) {
        this.operationalStatus = nextStatus;
        if (nextStatus == null) {
            return;
        }
        LocalDateTime effectiveChangedAt = changedAt == null ? LocalDateTime.now() : changedAt;
        switch (nextStatus) {
            case CANCELLED -> {
                if (this.cancelledAt == null) {
                    this.cancelledAt = effectiveChangedAt;
                }
            }
            case COMPLETED -> {
                if (this.completedAt == null) {
                    this.completedAt = effectiveChangedAt;
                }
            }
            case NO_SHOW -> {
                if (this.noShowMarkedAt == null) {
                    this.noShowMarkedAt = effectiveChangedAt;
                }
            }
            case PENDING, CONFIRMED -> {
            }
        }
    }
}
