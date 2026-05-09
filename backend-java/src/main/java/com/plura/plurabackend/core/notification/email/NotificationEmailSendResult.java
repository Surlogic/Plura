package com.plura.plurabackend.core.notification.email;

/**
 * NotificationEmailSendResult es un modelo inmutable del modulo notificaciones / email.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: notificaciones, email transaccional.
 */
public record NotificationEmailSendResult(
    NotificationEmailSendStatus status,
    String providerMessageId,
    String errorCode,
    String errorMessage
) {

    /**
     * Ejecuta la logica de sent manteniendola encapsulada en este componente.
     */
    public static NotificationEmailSendResult sent(String providerMessageId) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.SENT, providerMessageId, null, null);
    }

    /**
     * Ejecuta la logica de retryable failure manteniendola encapsulada en este componente.
     */
    public static NotificationEmailSendResult retryableFailure(String errorCode, String errorMessage) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.FAILED_RETRYABLE, null, errorCode, errorMessage);
    }

    /**
     * Ejecuta la logica de permanent failure manteniendola encapsulada en este componente.
     */
    public static NotificationEmailSendResult permanentFailure(String errorCode, String errorMessage) {
        return new NotificationEmailSendResult(NotificationEmailSendStatus.FAILED_PERMANENT, null, errorCode, errorMessage);
    }
}
