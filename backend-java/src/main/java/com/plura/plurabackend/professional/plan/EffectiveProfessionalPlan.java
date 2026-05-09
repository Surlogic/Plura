package com.plura.plurabackend.professional.plan;

/**
 * EffectiveProfessionalPlan es un modelo inmutable del modulo profesionales / planes.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: profesionales, planes.
 */
public record EffectiveProfessionalPlan(
    ProfessionalPlanCode code,
    ProfessionalPlanEntitlements entitlements
) {}
