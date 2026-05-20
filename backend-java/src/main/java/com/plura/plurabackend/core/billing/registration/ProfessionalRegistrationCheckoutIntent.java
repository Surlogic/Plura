package com.plura.plurabackend.core.billing.registration;

import com.plura.plurabackend.core.billing.payments.model.PaymentProvider;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "professional_registration_checkout_intent")
public class ProfessionalRegistrationCheckoutIntent {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "checkout_ref", nullable = false, unique = true, length = 80)
    private String checkoutRef;

    @Column(nullable = false, length = 320)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_code", nullable = false, length = 40)
    private SubscriptionPlanCode planCode;

    @Column(name = "registration_reference", nullable = false, unique = true, length = 160)
    private String registrationReference;

    @Column(name = "preapproval_plan_id", length = 160)
    private String preapprovalPlanId;

    @Column(name = "provider_subscription_id", length = 160)
    private String providerSubscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private PaymentProvider provider = PaymentProvider.MERCADOPAGO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProfessionalRegistrationCheckoutIntentStatus status =
        ProfessionalRegistrationCheckoutIntentStatus.CREATED;

    @Column(name = "checkout_url", columnDefinition = "TEXT")
    private String checkoutUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Version
    @Column(nullable = false)
    private Long version;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (id == null || id.isBlank()) {
            id = UUID.randomUUID().toString();
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
