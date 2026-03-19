package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationReadService {

    private final AppNotificationRepository appNotificationRepository;
    private final NotificationViewAssembler notificationViewAssembler;

    public NotificationReadService(
        AppNotificationRepository appNotificationRepository,
        NotificationViewAssembler notificationViewAssembler
    ) {
        this.appNotificationRepository = appNotificationRepository;
        this.notificationViewAssembler = notificationViewAssembler;
    }

    @Transactional(readOnly = true)
    public NotificationDetailView getDetail(
        NotificationRecipientType recipientType,
        String recipientId,
        String notificationId
    ) {
        return notificationViewAssembler.toDetail(loadOwnedNotification(recipientType, recipientId, notificationId));
    }

    @Transactional
    public void markAsRead(
        NotificationRecipientType recipientType,
        String recipientId,
        String notificationId
    ) {
        AppNotification notification = loadOwnedNotification(recipientType, recipientId, notificationId);
        if (notification.getReadAt() == null) {
            LocalDateTime readAt = LocalDateTime.now();
            int updated = appNotificationRepository.markAsReadIfUnread(
                notificationId.trim(),
                recipientType,
                recipientId.trim(),
                readAt
            );
            if (updated > 0) {
                notification.setReadAt(readAt);
            }
        }
    }

    @Transactional
    public int markAllAsRead(NotificationRecipientType recipientType, String recipientId) {
        return appNotificationRepository.markAllAsRead(recipientType, recipientId.trim(), LocalDateTime.now());
    }

    private AppNotification loadOwnedNotification(
        NotificationRecipientType recipientType,
        String recipientId,
        String notificationId
    ) {
        if (recipientType == null) {
            throw new IllegalArgumentException("recipientType es obligatorio");
        }
        if (recipientId == null || recipientId.trim().isBlank()) {
            throw new IllegalArgumentException("recipientId es obligatorio");
        }
        if (notificationId == null || notificationId.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificación no encontrada");
        }
        return appNotificationRepository.findByIdAndRecipientTypeAndRecipientId(
            notificationId.trim(),
            recipientType,
            recipientId.trim()
        ).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificación no encontrada"));
    }
}
