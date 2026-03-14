package com.plura.plurabackend.core.billing.payments.model;

import java.util.Locale;

public enum PaymentProvider {
    MERCADOPAGO,
    DLOCAL;

    public static PaymentProvider fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("provider es obligatorio");
        }
        try {
            return PaymentProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("provider inválido: " + value);
        }
    }
}
