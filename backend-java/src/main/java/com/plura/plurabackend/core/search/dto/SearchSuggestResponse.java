package com.plura.plurabackend.core.search.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * SearchSuggestResponse es un DTO de respuesta del modulo busqueda / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
@Data
@AllArgsConstructor
public class SearchSuggestResponse {
    private List<SearchSuggestCategoryResponse> categories;
    private List<SearchSuggestItemResponse> services;
    private List<SearchSuggestItemResponse> professionals;
    private List<SearchSuggestItemResponse> locals;
    private List<SearchSuggestItemResponse> popularNearby;
}
