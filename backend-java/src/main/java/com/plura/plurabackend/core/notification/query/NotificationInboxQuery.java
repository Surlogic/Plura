package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.NotificationEventType;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import java.time.LocalDateTime;
import java.util.Set;

public record NotificationInboxQuery(
    NotificationRecipientType recipientType,
    String recipientId,
    NotificationInboxStatus status,
    Set<NotificationEventType> types,
    Long bookingId,
    LocalDateTime from,
    LocalDateTime to,
    int page,
    int size
) {}
