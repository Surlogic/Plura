package com.plura.plurabackend.core.analytics.tracking.dto;

import java.util.Map;

/**
 * PublicProductAnalyticsEventRequest es un modelo inmutable del modulo analytics / tracking / contratos DTO.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Validacion: sus anotaciones Bean Validation son parte del contrato publico del endpoint que lo recibe.
 * Foco funcional: analytics, superficie publica.
 */
public record PublicProductAnalyticsEventRequest(
    String eventKey,
    String sourceSurface,
    String stepName,
    Long professionalId,
    String professionalSlug,
    String professionalRubro,
    String categorySlug,
    String categoryLabel,
    String serviceId,
    Long bookingId,
    String city,
    String country,
    Map<String, Object> metadata
) {
}
