package com.plura.plurabackend.booking.ops.dto;

import java.time.LocalDateTime;

public record InternalPaymentEventResponse(
    String id,
    String provider,
    String eventType,
    String providerEventId,
    String providerObjectId,
    Boolean processed,
    LocalDateTime processedAt,
    String processingError,
    LocalDateTime createdAt
) {}
