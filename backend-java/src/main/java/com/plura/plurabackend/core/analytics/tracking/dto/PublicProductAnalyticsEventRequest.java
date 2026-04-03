package com.plura.plurabackend.core.analytics.tracking.dto;

import java.util.Map;

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
