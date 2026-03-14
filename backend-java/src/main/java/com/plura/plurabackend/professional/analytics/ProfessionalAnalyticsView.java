package com.plura.plurabackend.professional.analytics;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum ProfessionalAnalyticsView {
    BASIC,
    ADVANCED;

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
