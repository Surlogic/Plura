package com.plura.plurabackend.productplan;

import com.plura.plurabackend.billing.subscriptions.model.Subscription;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionPlan;
import com.plura.plurabackend.billing.subscriptions.model.SubscriptionStatus;
import com.plura.plurabackend.billing.subscriptions.repository.SubscriptionRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class EffectiveProductPlanService {

    private final SubscriptionRepository subscriptionRepository;
    private final ProductPlanPolicyService productPlanPolicyService;

    public EffectiveProductPlanService(
        SubscriptionRepository subscriptionRepository,
        ProductPlanPolicyService productPlanPolicyService
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.productPlanPolicyService = productPlanPolicyService;
    }

    public EffectiveProductPlan resolveForProfessional(ProfessionalProfile profile) {
        if (profile == null || profile.getId() == null) {
            return resolveDefault();
        }

        return subscriptionRepository.findByProfessional_Id(profile.getId())
            .filter(this::isSubscriptionActiveForCapabilities)
            .map(subscription -> toEffectivePlan(subscription.getPlan()))
            .orElseGet(this::resolveDefault);
    }

    public EffectiveProductPlan resolveDefault() {
        return new EffectiveProductPlan(
            ProductPlanCode.BASIC,
            productPlanPolicyService.capabilitiesFor(ProductPlanCode.BASIC)
        );
    }

    private boolean isSubscriptionActiveForCapabilities(Subscription subscription) {
        if (subscription == null || subscription.getStatus() != SubscriptionStatus.ACTIVE) {
            return false;
        }
        LocalDateTime currentPeriodEnd = subscription.getCurrentPeriodEnd();
        return currentPeriodEnd == null || !currentPeriodEnd.isBefore(LocalDateTime.now());
    }

    private EffectiveProductPlan toEffectivePlan(SubscriptionPlan subscriptionPlan) {
        ProductPlanCode code = switch (subscriptionPlan) {
            case PLAN_BASIC -> ProductPlanCode.BASIC;
            case PLAN_PRO -> ProductPlanCode.PROFESSIONAL;
            case PLAN_PREMIUM -> ProductPlanCode.COMPANY;
        };
        return new EffectiveProductPlan(code, productPlanPolicyService.capabilitiesFor(code));
    }
}
