package com.plura.plurabackend.core.billing.trial.repository;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;
import com.plura.plurabackend.core.billing.trial.model.BillingTrialClaim;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BillingTrialClaimRepository extends JpaRepository<BillingTrialClaim, Long> {

    boolean existsByPlanCodeAndEmailHash(SubscriptionPlanCode planCode, String emailHash);

    boolean existsByPlanCodeAndPhoneHash(SubscriptionPlanCode planCode, String phoneHash);

    boolean existsByPlanCodeAndOauthIdentityHash(SubscriptionPlanCode planCode, String oauthIdentityHash);
}
