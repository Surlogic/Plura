package com.plura.plurabackend.core.notification.email;

/**
 * NotificationEmailTemplateException es un excepcion controlada del modulo notificaciones / email.
 * Responsabilidad: representar un error esperado del dominio o de una integracion.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, email transaccional.
 */
public class NotificationEmailTemplateException extends RuntimeException {

    public NotificationEmailTemplateException(String message) {
        super(message);
    }

    public NotificationEmailTemplateException(String message, Throwable cause) {
        super(message, cause);
    }
}
