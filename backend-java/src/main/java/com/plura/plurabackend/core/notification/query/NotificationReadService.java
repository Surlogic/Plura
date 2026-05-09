package com.plura.plurabackend.core.notification.query;

import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationRecipientType;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * NotificationReadService es un servicio de negocio del modulo notificaciones / consultas.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: appNotificationRepository, notificationViewAssembler.
 * Foco funcional: notificaciones, servicios.
 */
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

    /**
     * Marca como leida y actualiza los indicadores relacionados.
     */
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

    /**
     * Marca todos como leida y actualiza los indicadores relacionados.
     */
    @Transactional
    public int markAllAsRead(NotificationRecipientType recipientType, String recipientId) {
        return appNotificationRepository.markAllAsRead(recipientType, recipientId.trim(), LocalDateTime.now());
    }

    /**
     * Carga la seccion owned notificacion desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
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
