package com.plura.plurabackend.booking.ops.dto;

import java.time.LocalDateTime;

public record InternalBookingEventResponse(
    String id,
    String eventType,
    String actorType,
    Long actorUserId,
    String payloadJson,
    LocalDateTime createdAt
) {}
