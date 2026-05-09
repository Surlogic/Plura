package com.plura.plurabackend.professional.analytics;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * ProfessionalAnalyticsView es un enum de dominio del modulo profesionales / analytics.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, analytics.
 */
public enum ProfessionalAnalyticsView {
    BASIC,
    ADVANCED;

    /**
     * Construye el valor interno a partir de nullable string recibido como entrada.
     */
    public static ProfessionalAnalyticsView fromNullableString(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return BASIC;
        }
        try {
            return valueOf(rawValue.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vista de analytics inválida");
        }
    }
}
