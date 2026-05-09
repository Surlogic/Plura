package com.plura.plurabackend.core.search.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * SearchSuggestCategoryResponse es un DTO de respuesta del modulo busqueda / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: categorias, busqueda.
 */
@Data
@AllArgsConstructor
public class SearchSuggestCategoryResponse {
    private String name;
    private String slug;
}
