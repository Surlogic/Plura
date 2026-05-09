package com.plura.plurabackend.core.search.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * SearchResponse es un DTO de respuesta del modulo busqueda / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
@Data
@AllArgsConstructor
public class SearchResponse {
    private int page;
    private int size;
    private long total;
    private List<SearchItemResponse> items;
}
