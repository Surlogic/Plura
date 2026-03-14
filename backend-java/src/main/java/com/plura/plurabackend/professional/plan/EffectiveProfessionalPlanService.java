package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.core.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class EffectiveProfessionalPlanService {

    private final SubscriptionRepository subscriptionRepository;
    private final ProfessionalPlanPolicyService professionalPlanPolicyService;

    public EffectiveProfessionalPlanService(
        SubscriptionRepository subscriptionRepository,
        ProfessionalPlanPolicyService professionalPlanPolicyService
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.professionalPlanPolicyService = professionalPlanPolicyService;
    }

    public EffectiveProfessionalPlan resolveForProfessional(ProfessionalProfile profile) {
        if (profile == null || profile.getId() == null) {
            return resolveDefault();
        }

        return subscriptionRepository.findByProfessionalId(profile.getId())
            .filter(this::isSubscriptionActiveForCapabilities)
            .map(subscription -> {
                ProfessionalPlanCode code = SubscriptionPlanMapper.toProfessionalPlan(subscription.getPlan());
                return new EffectiveProfessionalPlan(code, professionalPlanPolicyService.entitlementsFor(code));
            })
            .orElseGet(this::resolveDefault);
    }

    public EffectiveProfessionalPlan resolveDefault() {
        ProfessionalPlanCode code = ProfessionalPlanCode.BASIC;
        return new EffectiveProfessionalPlan(code, professionalPlanPolicyService.entitlementsFor(code));
    }

    private boolean isSubscriptionActiveForCapabilities(Subscription subscription) {
        if (subscription == null || subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            return false;
        }
        LocalDateTime currentPeriodEnd = subscription.getCurrentPeriodEnd();
        return currentPeriodEnd == null || !currentPeriodEnd.isBefore(LocalDateTime.now());
    }
}
