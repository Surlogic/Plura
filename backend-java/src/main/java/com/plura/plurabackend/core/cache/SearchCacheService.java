package com.plura.plurabackend.core.cache;

import com.plura.plurabackend.core.search.dto.SearchResponse;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.util.Optional;

/**
 * SearchCacheService es un contrato interno del modulo cache.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios, busqueda, cache.
 */
public interface SearchCacheService {
    Optional<SearchResponse> getSearch(String key);

    void putSearch(String key, SearchResponse response);

    Optional<SearchSuggestResponse> getSuggest(String key);

    void putSuggest(String key, SearchSuggestResponse response);

    default void evictAll() {}
}
