package com.plura.plurabackend.usuario.notification.dto;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationSeverity;
import java.time.LocalDateTime;

public record ClientNotificationItemResponse(
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
