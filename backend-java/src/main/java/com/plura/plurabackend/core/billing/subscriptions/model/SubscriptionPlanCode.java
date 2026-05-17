package com.plura.plurabackend.core.billing.subscriptions.model;

/**
 * SubscriptionPlanCode es un enum de dominio del modulo billing / suscripciones / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: suscripciones, planes.
 */
public enum SubscriptionPlanCode {
    PLAN_CORE;

    /**
     * Construye el valor interno a partir de code recibido como entrada.
     */
    public static SubscriptionPlanCode fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("planCode es obligatorio");
        }
        String normalized = value.trim().toUpperCase(java.util.Locale.ROOT);
        return switch (normalized) {
            case "PLAN_CORE", "CORE" -> PLAN_CORE;
            default -> throw new IllegalArgumentException("planCode inválido: " + value);
        };
    }

    /**
     * Evalua canonical code y devuelve una decision booleana para el llamador.
     */
    public String canonicalCode() {
        return "PLAN_CORE";
    }
}
