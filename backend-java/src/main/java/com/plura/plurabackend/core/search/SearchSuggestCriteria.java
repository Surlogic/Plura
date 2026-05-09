package com.plura.plurabackend.core.search;

/**
 * SearchSuggestCriteria es un modelo inmutable del modulo busqueda.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
public record SearchSuggestCriteria(
    String query,
    Double lat,
    Double lng,
    String city,
    double radiusKm,
    int limit
) {
    /**
     * Evalua has coordinates y devuelve una decision booleana para el llamador.
     */
    public boolean hasCoordinates() {
        return lat != null && lng != null;
    }

    /**
     * Evalua has location filter y devuelve una decision booleana para el llamador.
     */
    public boolean hasLocationFilter() {
        return hasCoordinates() || (city != null && !city.isBlank());
    }
}
