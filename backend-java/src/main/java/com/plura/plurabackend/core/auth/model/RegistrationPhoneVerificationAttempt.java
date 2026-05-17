package com.plura.plurabackend.core.auth.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
    name = "auth_registration_phone_verification",
    indexes = {
        @Index(
            name = "idx_auth_registration_phone_verification_phone_created",
            columnList = "phone_number, created_at"
        ),
        @Index(
            name = "idx_auth_registration_phone_verification_expires",
            columnList = "expires_at"
        )
    }
)
public class RegistrationPhoneVerificationAttempt {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "phone_number", nullable = false, length = 30)
    private String phoneNumber;

    @Column(name = "provider_request_id", nullable = false, length = 100)
    private String providerRequestId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
