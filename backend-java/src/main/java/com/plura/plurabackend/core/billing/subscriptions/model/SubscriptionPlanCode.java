package com.plura.plurabackend.core.billing.subscriptions.model;

import java.util.Locale;

public enum SubscriptionPlanCode {
    PLAN_BASIC,
    PLAN_PROFESIONAL,
    PLAN_ENTERPRISE;

    public static SubscriptionPlanCode fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("planCode es obligatorio");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PLAN_BASIC" -> PLAN_BASIC;
            case "PLAN_PROFESIONAL" -> PLAN_PROFESIONAL;
            case "PLAN_ENTERPRISE" -> PLAN_ENTERPRISE;
            default -> throw new IllegalArgumentException("planCode inválido: " + value);
        };
    }

    public String canonicalCode() {
        return name();
    }
}
