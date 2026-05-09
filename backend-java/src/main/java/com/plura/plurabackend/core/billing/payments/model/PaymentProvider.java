package com.plura.plurabackend.core.billing.payments.model;

import java.util.Locale;

/**
 * PaymentProvider es un enum de dominio del modulo billing / pagos / modelo.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: proveedores externos, pagos.
 */
public enum PaymentProvider {
    MERCADOPAGO,
    DLOCAL;

    /**
     * Evalua is runtime supported y devuelve una decision booleana para el llamador.
     */
    public boolean isRuntimeSupported() {
        return this == MERCADOPAGO;
    }

    /**
     * Evalua is legacy read only y devuelve una decision booleana para el llamador.
     */
    public boolean isLegacyReadOnly() {
        return !isRuntimeSupported();
    }

    /**
     * Construye el valor interno a partir de code recibido como entrada.
     */
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
