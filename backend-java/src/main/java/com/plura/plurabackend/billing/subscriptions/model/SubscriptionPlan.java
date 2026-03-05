package com.plura.plurabackend.billing.subscriptions.model;

import java.util.Locale;

public enum SubscriptionPlan {
    PLAN_BASIC,
    PLAN_PRO,
    PLAN_PREMIUM;

    public static SubscriptionPlan fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("planCode es obligatorio");
        }
        try {
            return SubscriptionPlan.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("planCode inválido: " + value);
        }
    }
}
