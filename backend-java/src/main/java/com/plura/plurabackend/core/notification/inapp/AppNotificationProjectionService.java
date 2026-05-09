package com.plura.plurabackend.core.notification.inapp;

import com.plura.plurabackend.core.notification.application.NotificationInAppProjectionCommand;
import com.plura.plurabackend.core.notification.model.AppNotification;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.repository.AppNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AppNotificationProjectionService es un servicio de negocio del modulo notificaciones / in-app.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: appNotificationRepository.
 * Foco funcional: notificaciones, servicios.
 */
@Service
public class AppNotificationProjectionService {

    private final AppNotificationRepository appNotificationRepository;

    public AppNotificationProjectionService(AppNotificationRepository appNotificationRepository) {
        this.appNotificationRepository = appNotificationRepository;
    }

    /**
     * Ejecuta la logica de project manteniendola encapsulada en este componente.
     */
    @Transactional
    public AppNotification project(NotificationEvent event, NotificationInAppProjectionCommand projection) {
        if (event == null || projection == null) {
            throw new IllegalArgumentException("Evento y proyeccion in-app son obligatorios");
        }

        AppNotification existing = appNotificationRepository.findByNotificationEvent_Id(event.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        AppNotification appNotification = new AppNotification();
        appNotification.setNotificationEvent(event);
        appNotification.setRecipientType(event.getRecipientType());
        appNotification.setRecipientId(event.getRecipientId());
        appNotification.setTitle(requireText(projection.title(), "title"));
        appNotification.setBody(requireText(projection.body(), "body"));
        appNotification.setSeverity(projection.severity() == null
            ? com.plura.plurabackend.core.notification.model.NotificationSeverity.INFO
            : projection.severity());
        appNotification.setCategory(normalizeOptional(projection.category()));
        appNotification.setActionUrl(normalizeOptional(projection.actionUrl()));
        appNotification.setActionLabel(normalizeOptional(projection.actionLabel()));
        return appNotificationRepository.save(appNotification);
    }

    /**
     * Exige text y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private String requireText(String value, String field) {
        if (value == null || value.trim().isBlank()) {
            throw new IllegalArgumentException(field + " es obligatorio para proyectar notificacion in-app");
        }
        return value.trim();
    }

    /**
     * Normaliza opcional para evitar variantes vacias, invalidas o inconsistentes.
     */
    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
