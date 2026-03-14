package com.plura.plurabackend.core.search.dto;

import java.util.Locale;

public enum SearchType {
    RUBRO,
    PROFESIONAL,
    LOCAL,
    SERVICIO;

    public static SearchType fromRaw(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return null;
        }
        return SearchType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
    }
}
