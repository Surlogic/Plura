package com.plura.plurabackend.core.notification.application;

import com.plura.plurabackend.core.notification.dispatch.NotificationProjectionDispatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * NotificationService es un servicio de negocio del modulo notificaciones / aplicacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: notificationEventService, notificationProjectionDispatcher.
 * Foco funcional: notificaciones, servicios.
 */
@Service
public class NotificationService {

    private final NotificationEventService notificationEventService;
    private final NotificationProjectionDispatcher notificationProjectionDispatcher;

    public NotificationService(
        NotificationEventService notificationEventService,
        NotificationProjectionDispatcher notificationProjectionDispatcher
    ) {
        this.notificationEventService = notificationEventService;
        this.notificationProjectionDispatcher = notificationProjectionDispatcher;
    }

    /**
     * Registra record para auditoria, historial o notificaciones.
     */
    @Transactional
    public NotificationRegistrationResult record(NotificationRecordCommand command) {
        NotificationEventService.NotificationEventRegistration registration =
            notificationEventService.recordCanonicalEvent(command);

        if (registration.created()) {
            notificationProjectionDispatcher.dispatch(registration.event(), command);
        }

        return new NotificationRegistrationResult(
            registration.event().getId(),
            registration.event().getEventUuid(),
            registration.created()
        );
    }
}
