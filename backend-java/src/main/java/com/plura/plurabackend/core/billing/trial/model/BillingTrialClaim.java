package com.plura.plurabackend.core.billing.trial.model;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "billing_trial_claim")
public class BillingTrialClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_code", nullable = false, length = 30)
    private SubscriptionPlanCode planCode;

    @Column(name = "email_hash", length = 64)
    private String emailHash;

    @Column(name = "phone_hash", length = 64)
    private String phoneHash;

    @Column(name = "oauth_identity_hash", length = 64)
    private String oauthIdentityHash;

    @Column(name = "first_user_id", nullable = false)
    private Long firstUserId;

    @Column(name = "first_professional_id", nullable = false)
    private Long firstProfessionalId;

    @Column(name = "claimed_at", nullable = false)
    private LocalDateTime claimedAt;

    @PrePersist
    void onCreate() {
        if (this.claimedAt == null) {
            this.claimedAt = LocalDateTime.now();
        }
    }
}
