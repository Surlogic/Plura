package com.plura.plurabackend.professional.plan;

import com.plura.plurabackend.core.billing.subscriptions.model.SubscriptionPlanCode;

/**
 * SubscriptionPlanMapper es un mapper del modulo profesionales / planes.
 * Responsabilidad: convertir modelos internos en DTOs o vistas sin filtrar datos en el controller.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: suscripciones, planes.
 */
public final class SubscriptionPlanMapper {

    private SubscriptionPlanMapper() {}

    /**
     * Convierte datos internos al formato profesional plan esperado por el consumidor.
     */
    public static ProfessionalPlanCode toProfessionalPlan(SubscriptionPlanCode subscriptionPlan) {
        if (subscriptionPlan == null) {
            return ProfessionalPlanCode.PROFESSIONAL;
        }
        return switch (subscriptionPlan) {
            case PLAN_PROFESSIONAL -> ProfessionalPlanCode.PROFESSIONAL;
            case PLAN_LOCAL -> ProfessionalPlanCode.LOCAL;
            case PLAN_ENTERPRISE -> ProfessionalPlanCode.ENTERPRISE;
        };
    }
}
