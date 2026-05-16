package com.plura.plurabackend.professional.plan;

/**
 * ProfessionalPlanRank es un componente de dominio del modulo profesionales / planes.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, planes.
 */
public final class ProfessionalPlanRank {

    private ProfessionalPlanRank() {}

    /**
     * Convierte un valor externo al enum o tipo interno correspondiente.
     */
    public static int valueOf(ProfessionalPlanCode code) {
        if (code == null) {
            return 0;
        }
        return switch (code) {
            case CORE -> 0;
            case PROFESSIONAL -> 0;
            case LOCAL -> 0;
            case ENTERPRISE -> 0;
        };
    }
}
