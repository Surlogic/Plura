package com.plura.plurabackend.professional.plan;

import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalPlanPolicyService {

    private static final int PRACTICAL_UNLIMITED = 9999;

    private final Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlementsByPlan;

    public ProfessionalPlanPolicyService() {
        Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlements = new EnumMap<>(ProfessionalPlanCode.class);
        entitlements.put(ProfessionalPlanCode.BASIC, basicEntitlements());
        entitlements.put(ProfessionalPlanCode.PROFESIONAL, profesionalEntitlements());
        entitlements.put(ProfessionalPlanCode.ENTERPRISE, enterpriseEntitlements());
        this.entitlementsByPlan = Map.copyOf(entitlements);
    }

    public ProfessionalPlanEntitlements entitlementsFor(ProfessionalPlanCode code) {
        if (code == null) {
            return entitlementsByPlan.get(ProfessionalPlanCode.BASIC);
        }
        return entitlementsByPlan.getOrDefault(code, entitlementsByPlan.get(ProfessionalPlanCode.BASIC));
    }

    private ProfessionalPlanEntitlements basicEntitlements() {
        return new ProfessionalPlanEntitlements(
            1,
            1,
            3,
            1,
            15,
            PublicProfileTier.ENHANCED,
            ScheduleTier.DAILY,
            AnalyticsTier.NONE,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        );
    }

    private ProfessionalPlanEntitlements profesionalEntitlements() {
        return new ProfessionalPlanEntitlements(
            1,
            1,
            6,
            1,
            30,
            PublicProfileTier.ENHANCED,
            ScheduleTier.WEEKLY,
            AnalyticsTier.BASIC,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false
        );
    }

    private ProfessionalPlanEntitlements enterpriseEntitlements() {
        return new ProfessionalPlanEntitlements(
            PRACTICAL_UNLIMITED,
            PRACTICAL_UNLIMITED,
            10,
            1,
            PRACTICAL_UNLIMITED,
            PublicProfileTier.ENHANCED,
            ScheduleTier.MASTER,
            AnalyticsTier.ADVANCED,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true
        );
    }
}
