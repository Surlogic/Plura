package com.plura.plurabackend.core.notification.application;

import com.plura.plurabackend.core.notification.model.NotificationSeverity;

public record NotificationInAppProjectionCommand(
    String title,
    String body,
    NotificationSeverity severity,
    String category,
    String actionUrl,
    String actionLabel
) {}
