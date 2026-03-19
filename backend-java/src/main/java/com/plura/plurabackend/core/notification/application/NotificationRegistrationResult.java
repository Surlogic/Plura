package com.plura.plurabackend.core.notification.application;

public record NotificationRegistrationResult(
    String notificationEventId,
    String eventUuid,
    boolean created
) {}
