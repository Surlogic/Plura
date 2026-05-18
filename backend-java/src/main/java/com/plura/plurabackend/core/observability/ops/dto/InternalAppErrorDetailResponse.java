package com.plura.plurabackend.core.observability.ops.dto;

public record InternalAppErrorDetailResponse(
    Long id,
    String fingerprint,
    String source,
    String severity,
    String errorType,
    String message,
    String stackTrace,
    String route,
    String httpMethod,
    Integer httpStatus,
    String traceId,
    String clientSessionId,
    String contextJson,
    Long occurrenceCount,
    String firstSeenAt,
    String lastSeenAt,
    String resolvedAt
) {}
