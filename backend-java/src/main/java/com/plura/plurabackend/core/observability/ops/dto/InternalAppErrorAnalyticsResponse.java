package com.plura.plurabackend.core.observability.ops.dto;

import java.util.Map;

public record InternalAppErrorAnalyticsResponse(
    long totalIncidents,
    long openIncidents,
    long incidentsSeenInRange,
    Map<String, Long> countBySource,
    Map<String, Long> countBySeverity
) {}
