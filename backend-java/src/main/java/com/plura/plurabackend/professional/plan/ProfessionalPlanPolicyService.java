package com.plura.plurabackend.professional.plan;

import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * ProfessionalPlanPolicyService es un servicio de negocio del modulo profesionales / planes.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, servicios, planes.
 */
@Service
public class ProfessionalPlanPolicyService {

    private static final int PRACTICAL_UNLIMITED = 9999;

    private final Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlementsByPlan;

    public ProfessionalPlanPolicyService() {
        Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlements = new EnumMap<>(ProfessionalPlanCode.class);
        entitlements.put(ProfessionalPlanCode.PROFESSIONAL, professionalEntitlements());
        entitlements.put(ProfessionalPlanCode.LOCAL, localEntitlements());
        entitlements.put(ProfessionalPlanCode.ENTERPRISE, enterpriseEntitlements());
        this.entitlementsByPlan = Map.copyOf(entitlements);
    }

    /**
     * Ejecuta la logica de entitlements for manteniendola encapsulada en este componente.
     */
    public ProfessionalPlanEntitlements entitlementsFor(ProfessionalPlanCode code) {
        if (code == null) {
            return entitlementsByPlan.get(ProfessionalPlanCode.PROFESSIONAL);
        }
        return entitlementsByPlan.getOrDefault(code, entitlementsByPlan.get(ProfessionalPlanCode.PROFESSIONAL));
    }

    /**
     * Ejecuta la logica de professional entitlements manteniendola encapsulada en este componente.
     */
    private ProfessionalPlanEntitlements professionalEntitlements() {
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

    /**
     * Ejecuta la logica de local entitlements manteniendola encapsulada en este componente.
     */
    private ProfessionalPlanEntitlements localEntitlements() {
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

    /**
     * Ejecuta la logica de enterprise entitlements manteniendola encapsulada en este componente.
     */
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
