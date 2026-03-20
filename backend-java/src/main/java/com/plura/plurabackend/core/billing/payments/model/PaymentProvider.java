package com.plura.plurabackend.core.billing.payments.model;

import java.util.Locale;

public enum PaymentProvider {
    MERCADOPAGO,
    DLOCAL;

    public boolean isRuntimeSupported() {
        return this == MERCADOPAGO;
    }

    public boolean isLegacyReadOnly() {
        return !isRuntimeSupported();
    }

    public static PaymentProvider fromCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("provider es obligatorio");
        }
        try {
            PaymentProvider provider = PaymentProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
            if (!provider.isRuntimeSupported()) {
                throw new IllegalArgumentException("provider no soportado en runtime: " + value);
            }
            return provider;
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("provider inválido: " + value);
        }
    }
}
