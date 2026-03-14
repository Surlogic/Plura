package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;

public final class SubscriptionPlanMapper {

    private SubscriptionPlanMapper() {}

    public static ProfessionalPlanCode toProfessionalPlan(SubscriptionPlanCode subscriptionPlan) {
        if (subscriptionPlan == null) {
            return ProfessionalPlanCode.BASIC;
        }
        return switch (subscriptionPlan) {
            case PLAN_BASIC -> ProfessionalPlanCode.BASIC;
            case PLAN_PROFESIONAL -> ProfessionalPlanCode.PROFESIONAL;
            case PLAN_ENTERPRISE -> ProfessionalPlanCode.ENTERPRISE;
        };
    }
}
