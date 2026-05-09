package com.plura.plurabackend.core.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * LoggingPasswordResetNotificationSender es un componente de dominio del modulo autenticacion.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, contrasenas.
 */
public class LoggingPasswordResetNotificationSender implements PasswordResetNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPasswordResetNotificationSender.class);

    /**
     * Envia contrasena reset mediante el canal configurado.
     */
    @Override
    public void sendPasswordReset(PasswordResetNotification notification) {
        if (notification == null || notification.user() == null) {
            return;
        }
        String email = notification.user().getEmail();
        String maskedEmail = maskEmail(email);
        LOGGER.info(
            "Password reset solicitado para {}. Stub activo, sin envio real. URL preparada: {}",
            maskedEmail,
            redactToken(notification.resetUrl(), notification.rawToken())
        );
    }

    /**
     * Ejecuta la logica de mask email manteniendola encapsulada en este componente.
     */
    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "desconocido";
        }
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(atIndex, 0));
        }
        return email.substring(0, 1) + "***" + email.substring(atIndex);
    }

    /**
     * Ejecuta la logica de redact token manteniendola encapsulada en este componente.
     */
    private String redactToken(String resetUrl, String rawToken) {
        if (resetUrl == null || resetUrl.isBlank() || rawToken == null || rawToken.isBlank()) {
            return "n/a";
        }
        return resetUrl.replace(rawToken, "[redacted]");
    }
}
