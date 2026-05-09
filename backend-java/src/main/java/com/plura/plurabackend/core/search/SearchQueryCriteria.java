package com.plura.plurabackend.core.search;

import com.plura.plurabackend.core.search.dto.SearchSort;
import com.plura.plurabackend.core.search.dto.SearchType;
import java.time.LocalDate;

/**
 * SearchQueryCriteria es un modelo inmutable del modulo busqueda.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
public record SearchQueryCriteria(
    SearchType type,
    String query,
    String categorySlug,
    Double lat,
    Double lng,
    double radiusKm,
    String city,
    LocalDate dateFrom,
    LocalDate dateTo,
    boolean availableNow,
    int page,
    int size,
    SearchSort sort
) {
    /**
     * Ejecuta la logica de offset manteniendola encapsulada en este componente.
     */
    public int offset() {
        return page * size;
    }

    /**
     * Evalua has coordinates y devuelve una decision booleana para el llamador.
     */
    public boolean hasCoordinates() {
        return lat != null && lng != null;
    }
}
