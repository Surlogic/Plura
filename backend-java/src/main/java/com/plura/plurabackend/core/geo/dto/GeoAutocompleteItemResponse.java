package com.plura.plurabackend.core.geo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * GeoAutocompleteItemResponse es un DTO de respuesta del modulo geolocalizacion / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: geolocalizacion.
 */
@Data
@AllArgsConstructor
public class GeoAutocompleteItemResponse {
    private String label;
    private String city;
    private Double lat;
    private Double lng;
}
