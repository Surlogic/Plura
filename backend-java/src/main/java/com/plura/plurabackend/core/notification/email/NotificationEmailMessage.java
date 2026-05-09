package com.plura.plurabackend.core.notification.email;

/**
 * NotificationEmailMessage es un modelo inmutable del modulo notificaciones / email.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, email transaccional.
 */
public record NotificationEmailMessage(
    String templateKey,
    String toAddress,
    String toName,
    String subject,
    String htmlBody,
    String textBody
) {}
