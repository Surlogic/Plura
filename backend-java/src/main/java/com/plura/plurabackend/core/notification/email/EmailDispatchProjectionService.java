package com.plura.plurabackend.core.notification.email;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.notification.application.NotificationEmailProjectionCommand;
import com.plura.plurabackend.core.notification.metrics.NotificationMetricsService;
import com.plura.plurabackend.core.notification.model.EmailDispatch;
import com.plura.plurabackend.core.notification.model.EmailDispatchStatus;
import com.plura.plurabackend.core.notification.model.NotificationEvent;
import com.plura.plurabackend.core.notification.repository.EmailDispatchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * EmailDispatchProjectionService es un servicio de negocio del modulo notificaciones / email.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: emailDispatchRepository, objectMapper, notificationMetricsService.
 * Foco funcional: servicios, email transaccional.
 */
@Service
public class EmailDispatchProjectionService {

    private final EmailDispatchRepository emailDispatchRepository;
    private final ObjectMapper objectMapper;
    private final NotificationMetricsService notificationMetricsService;

    public EmailDispatchProjectionService(
        EmailDispatchRepository emailDispatchRepository,
        ObjectMapper objectMapper,
        NotificationMetricsService notificationMetricsService
    ) {
        this.emailDispatchRepository = emailDispatchRepository;
        this.objectMapper = objectMapper;
        this.notificationMetricsService = notificationMetricsService;
    }

    /**
     * Ejecuta la logica de project pending manteniendola encapsulada en este componente.
     */
    @Transactional
    public EmailDispatch projectPending(NotificationEvent event, NotificationEmailProjectionCommand projection) {
        if (event == null || projection == null) {
            throw new IllegalArgumentException("Evento y proyeccion email son obligatorios");
        }

        EmailDispatch existing = emailDispatchRepository.findByNotificationEvent_Id(event.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        EmailDispatch dispatch = new EmailDispatch();
        dispatch.setNotificationEvent(event);
        dispatch.setRecipientEmail(requireText(projection.recipientEmail(), "recipientEmail"));
        dispatch.setTemplateKey(requireText(projection.templateKey(), "templateKey"));
        dispatch.setSubject(requireText(projection.subject(), "subject"));
        dispatch.setPayloadJson(writeJson(projection.payload()));
        dispatch.setStatus(EmailDispatchStatus.PENDING);
        dispatch.setAttemptCount(0);
        EmailDispatch saved = emailDispatchRepository.save(dispatch);
        notificationMetricsService.refreshEmailDispatchStatusGauges();
        return saved;
    }

    /**
     * Guarda json en el formato persistido esperado por el modulo.
     */
    private String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo serializar payload de email dispatch", exception);
        }
    }

    /**
     * Exige text y corta la ejecucion si falta autorizacion o contexto.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private String requireText(String value, String field) {
        if (value == null || value.trim().isBlank()) {
            throw new IllegalArgumentException(field + " es obligatorio para proyectar email dispatch");
        }
        return value.trim();
    }
}
