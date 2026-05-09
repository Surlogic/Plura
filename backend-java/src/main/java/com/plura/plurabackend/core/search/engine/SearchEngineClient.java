package com.plura.plurabackend.core.search.engine;

import com.plura.plurabackend.core.search.SearchQueryCriteria;
import com.plura.plurabackend.core.search.SearchSuggestCriteria;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.util.List;

/**
 * SearchEngineClient es un contrato interno del modulo busqueda / motor.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: clientes, busqueda.
 */
public interface SearchEngineClient {
    SearchEngineSearchResult search(SearchQueryCriteria criteria);

    SearchSuggestResponse suggest(SearchSuggestCriteria criteria);

    void upsertDocuments(List<SearchIndexDocument> documents);
}
