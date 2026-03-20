package com.plura.plurabackend.core.billing.providerconnection.model;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
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
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "professional_payment_provider_connection",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_prof_payment_provider_connection_professional_provider",
            columnNames = {"professional_id", "provider"}
        )
    },
    indexes = {
        @Index(
            name = "idx_prof_payment_provider_connection_provider_user",
            columnList = "provider, provider_user_id"
        ),
        @Index(
            name = "idx_prof_payment_provider_connection_status",
            columnList = "status, updated_at"
        )
    }
)
public class ProfessionalPaymentProviderConnection {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "professional_id", nullable = false)
    private Long professionalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ProfessionalPaymentProviderConnectionStatus status;

    @Column(name = "provider_account_id", length = 128)
    private String providerAccountId;

    @Column(name = "provider_user_id", length = 128)
    private String providerUserId;

    @Column(name = "access_token_encrypted", columnDefinition = "text")
    private String accessTokenEncrypted;

    @Column(name = "refresh_token_encrypted", columnDefinition = "text")
    private String refreshTokenEncrypted;

    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    @Column(length = 255)
    private String scope;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "disconnected_at")
    private LocalDateTime disconnectedAt;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;

    @Column(name = "pending_oauth_state", length = 1024)
    private String pendingOauthState;

    @Column(name = "pending_oauth_state_expires_at")
    private LocalDateTime pendingOauthStateExpiresAt;

    @Column(name = "pending_oauth_code_verifier_encrypted", columnDefinition = "text")
    private String pendingOauthCodeVerifierEncrypted;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = ProfessionalPaymentProviderConnectionStatus.DISCONNECTED;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
