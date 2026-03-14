package com.plura.plurabackend.billing.providerops.dto;

import java.time.LocalDateTime;

public record InternalProviderOperationIssueResponse(
    String operationId,
    String operationType,
    String status,
    Long bookingId,
    String externalReference,
    Integer attemptCount,
    String lockedBy,
    LocalDateTime updatedAt,
    LocalDateTime nextAttemptAt,
    LocalDateTime leaseUntil,
    String lastError
) {}
