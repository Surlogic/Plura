package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;

public record NotificationInboxItemView(
    String id,
    NotificationEventType type,
    String title,
    String body,
    NotificationSeverity severity,
    String category,
    LocalDateTime createdAt,
    LocalDateTime readAt,
    Long bookingId,
    String actionUrl
) {}
