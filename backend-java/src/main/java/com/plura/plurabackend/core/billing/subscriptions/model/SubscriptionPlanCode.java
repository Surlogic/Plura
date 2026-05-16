package com.plura.plurabackend.core.billing.subscriptions.model;

import java.util.Locale;

/**
 * SubscriptionPlanCode es un enum de dominio del modulo billing / suscripciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: suscripciones, planes.
 */
public enum SubscriptionPlanCode {
    PLAN_CORE,
    PLAN_PROFESSIONAL,
    PLAN_LOCAL,
    PLAN_ENTERPRISE;

    /**
     * Construye el valor interno a partir de code recibido como entrada.
     */
    public static SubscriptionPlanCode fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("planCode es obligatorio");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PLAN_CORE", "CORE" -> PLAN_CORE;
            case "PLAN_BASIC",
                "PLAN_PRO",
                "PLAN_PROFESIONAL",
                "PLAN_PREMIUM",
                "PLAN_PROFESSIONAL",
                "PROFESSIONAL" -> PLAN_PROFESSIONAL;
            case "PLAN_LOCAL", "LOCAL" -> PLAN_LOCAL;
            case "PLAN_ENTERPRISE", "ENTERPRISE" -> PLAN_ENTERPRISE;
            default -> throw new IllegalArgumentException("planCode inválido: " + value);
        };
    }

    /**
     * Evalua canonical code y devuelve una decision booleana para el llamador.
     */
    public String canonicalCode() {
        return "PLAN_CORE";
    }

    public SubscriptionPlanCode normalizedCorePlan() {
        return PLAN_CORE;
    }
}
