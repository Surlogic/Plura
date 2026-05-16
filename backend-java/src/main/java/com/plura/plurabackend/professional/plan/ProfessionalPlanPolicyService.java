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

    private final Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlementsByPlan;

    public ProfessionalPlanPolicyService() {
        Map<ProfessionalPlanCode, ProfessionalPlanEntitlements> entitlements = new EnumMap<>(ProfessionalPlanCode.class);
        ProfessionalPlanEntitlements coreEntitlements = coreEntitlements();
        entitlements.put(ProfessionalPlanCode.CORE, coreEntitlements);
        entitlements.put(ProfessionalPlanCode.PROFESSIONAL, coreEntitlements);
        entitlements.put(ProfessionalPlanCode.LOCAL, coreEntitlements);
        entitlements.put(ProfessionalPlanCode.ENTERPRISE, coreEntitlements);
        this.entitlementsByPlan = Map.copyOf(entitlements);
    }

    /**
     * Ejecuta la logica de entitlements for manteniendola encapsulada en este componente.
     */
    public ProfessionalPlanEntitlements entitlementsFor(ProfessionalPlanCode code) {
        if (code == null) {
            return entitlementsByPlan.get(ProfessionalPlanCode.CORE);
        }
        return entitlementsByPlan.getOrDefault(code, entitlementsByPlan.get(ProfessionalPlanCode.CORE));
    }

    /**
     * Ejecuta la logica de professional entitlements manteniendola encapsulada en este componente.
     */
    private ProfessionalPlanEntitlements coreEntitlements() {
        return new ProfessionalPlanEntitlements(
            1,
            1,
            6,
            1,
            30,
            PublicProfileTier.ENHANCED,
            ScheduleTier.MASTER,
            AnalyticsTier.NONE,
            true,
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
}
