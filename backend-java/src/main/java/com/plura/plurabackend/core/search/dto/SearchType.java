package com.plura.plurabackend.core.search.dto;

import java.util.Locale;

/**
 * SearchType es un enum de dominio del modulo busqueda / contratos DTO.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: busqueda.
 */
public enum SearchType {
    RUBRO,
    PROFESIONAL,
    LOCAL,
    SERVICIO;

    /**
     * Construye el valor interno a partir de raw recibido como entrada.
     */
    public static SearchType fromRaw(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return null;
        }
        return SearchType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
    }
}
