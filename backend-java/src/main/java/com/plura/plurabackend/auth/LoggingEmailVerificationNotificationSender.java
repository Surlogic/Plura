package com.plura.plurabackend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
public class LoggingEmailVerificationNotificationSender implements EmailVerificationNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingEmailVerificationNotificationSender.class);

    @Override
    public void sendVerificationCode(EmailVerificationNotification notification) {
        if (notification == null || notification.user() == null) {
            return;
        }
        LOGGER.info(
            "Verificacion de email solicitada para {}. Stub activo, sin envio real. Codigo preparado: [redacted]",
            maskEmail(notification.email())
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
}
