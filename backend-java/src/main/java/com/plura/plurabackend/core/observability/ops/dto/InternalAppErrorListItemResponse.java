package com.plura.plurabackend.core.observability.ops.dto;

public record InternalAppErrorListItemResponse(
    Long id,
    String source,
    String severity,
    String errorType,
    String message,
    String route,
    String httpMethod,
    Integer httpStatus,
    String traceId,
    Long occurrenceCount,
    String firstSeenAt,
    String lastSeenAt,
    String resolvedAt
) {}
