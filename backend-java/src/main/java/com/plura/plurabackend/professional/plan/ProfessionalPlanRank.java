package com.plura.plurabackend.professional.plan;

public final class ProfessionalPlanRank {

    private ProfessionalPlanRank() {}

    public static int valueOf(ProfessionalPlanCode code) {
        if (code == null) {
            return 0;
        }
        return switch (code) {
            case BASIC -> 0;
            case PROFESIONAL -> 1;
            case ENTERPRISE -> 2;
        };
    }
}
