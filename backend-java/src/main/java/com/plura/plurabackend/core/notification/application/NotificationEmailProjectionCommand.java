package com.plura.plurabackend.core.notification.application;

import java.util.Map;

/**
 * NotificationEmailProjectionCommand es un modelo inmutable del modulo notificaciones / aplicacion.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, email transaccional.
 */
public record NotificationEmailProjectionCommand(
    String recipientEmail,
    String templateKey,
    String subject,
    Map<String, Object> payload
) {}
