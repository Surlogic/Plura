package com.plura.plurabackend.core.search.dto;

import java.util.Locale;

/**
 * SearchSort es un enum de dominio del modulo busqueda / contratos DTO.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: busqueda.
 */
public enum SearchSort {
    RELEVANCE,
    DISTANCE,
    RATING;

    /**
     * Construye el valor interno a partir de raw recibido como entrada.
     */
    public static SearchSort fromRaw(String rawSort) {
        if (rawSort == null || rawSort.isBlank()) {
            return RELEVANCE;
        }
        return SearchSort.valueOf(rawSort.trim().toUpperCase(Locale.ROOT));
    }
}
