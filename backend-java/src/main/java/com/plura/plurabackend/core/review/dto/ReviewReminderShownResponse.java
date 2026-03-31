package com.plura.plurabackend.core.review.dto;

public record ReviewReminderShownResponse(
    boolean recorded,
    int reminderCount,
    String reason
) {}
