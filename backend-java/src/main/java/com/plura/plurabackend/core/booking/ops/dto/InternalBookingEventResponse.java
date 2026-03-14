package com.plura.plurabackend.core.booking.ops.dto;

import java.time.LocalDateTime;

public record InternalBookingEventResponse(
    String id,
    String eventType,
    String actorType,
    Long actorUserId,
    String payloadJson,
    LocalDateTime createdAt
) {}
