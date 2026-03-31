package com.plura.plurabackend.core.review.dto;

import java.time.LocalDateTime;

public record ReviewReminderResponse(
    Long bookingId,
    String professionalName,
    String serviceName,
    LocalDateTime completedAt,
    LocalDateTime reviewWindowEndsAt,
    int reminderCount
) {}
