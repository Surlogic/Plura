package com.plura.plurabackend.booking.policy.model;

import com.plura.plurabackend.booking.policy.BookingPolicyDefaults;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "booking_policy")
public class BookingPolicy {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false, unique = true)
    private ProfessionalProfile professional;

    @Column(name = "allow_client_cancellation", nullable = false)
    private Boolean allowClientCancellation;

    @Column(name = "allow_client_reschedule", nullable = false)
    private Boolean allowClientReschedule;

    @Column(name = "cancellation_window_hours")
    private Integer cancellationWindowHours;

    @Column(name = "reschedule_window_hours")
    private Integer rescheduleWindowHours;

    @Column(name = "max_client_reschedules")
    private Integer maxClientReschedules;

    @Column(name = "retain_deposit_on_late_cancellation", nullable = false)
    private Boolean retainDepositOnLateCancellation;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.allowClientCancellation == null) {
            this.allowClientCancellation = BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_CANCELLATION;
        }
        if (this.allowClientReschedule == null) {
            this.allowClientReschedule = BookingPolicyDefaults.DEFAULT_ALLOW_CLIENT_RESCHEDULE;
        }
        if (this.maxClientReschedules == null) {
            this.maxClientReschedules = BookingPolicyDefaults.DEFAULT_MAX_CLIENT_RESCHEDULES;
        }
        if (this.retainDepositOnLateCancellation == null) {
            this.retainDepositOnLateCancellation = BookingPolicyDefaults.DEFAULT_RETAIN_DEPOSIT_ON_LATE_CANCELLATION;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
