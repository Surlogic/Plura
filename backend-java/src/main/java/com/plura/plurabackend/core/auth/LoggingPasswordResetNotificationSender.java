package com.plura.plurabackend.core.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
public class LoggingPasswordResetNotificationSender implements PasswordResetNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPasswordResetNotificationSender.class);

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

    private String redactToken(String resetUrl, String rawToken) {
        if (resetUrl == null || resetUrl.isBlank() || rawToken == null || rawToken.isBlank()) {
            return "n/a";
        }
        return resetUrl.replace(rawToken, "[redacted]");
    }
}
