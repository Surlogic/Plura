package com.plura.plurabackend.professional.plan;

import org.springframework.stereotype.Service;

/**
 * ProfessionalPlanPolicyService es un servicio de negocio del modulo profesionales / planes.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, servicios, planes.
 */
@Service
public class ProfessionalPlanPolicyService {

    private final ProfessionalPlanEntitlements coreEntitlements;

    public ProfessionalPlanPolicyService() {
        this.coreEntitlements = buildCoreEntitlements();
    }

    /**
     * Ejecuta la logica de entitlements for manteniendola encapsulada en este componente.
     */
    public ProfessionalPlanEntitlements entitlementsFor(ProfessionalPlanCode code) {
        return coreEntitlements;
    }

    /**
     * Ejecuta la logica de professional entitlements manteniendola encapsulada en este componente.
     */
    private ProfessionalPlanEntitlements buildCoreEntitlements() {
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
