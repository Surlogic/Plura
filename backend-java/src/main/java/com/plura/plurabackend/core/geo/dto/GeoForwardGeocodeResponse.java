package com.plura.plurabackend.core.geo.dto;

/**
 * GeoForwardGeocodeResponse es un modelo inmutable del modulo geolocalizacion / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: geolocalizacion.
 */
public record GeoForwardGeocodeResponse(
    Double latitude,
    Double longitude,
    String placeName
) {}
