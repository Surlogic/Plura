package com.plura.plurabackend.core.observability.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record ClientErrorReportRequest(
    @NotBlank @Size(max = 20) String source,
    @Size(max = 20) String severity,
    @Size(max = 255) String errorType,
    @NotBlank @Size(max = 4000) String message,
    @Size(max = 12000) String stackTrace,
    @Size(max = 512) String route,
    @Size(max = 16) String httpMethod,
    Integer httpStatus,
    @Size(max = 128) String traceId,
    @Size(max = 128) String sessionId,
    Map<String, Object> context
) {}
