package com.plura.plurabackend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingPhoneVerificationNotificationSender implements PhoneVerificationNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPhoneVerificationNotificationSender.class);

    @Override
    public void sendVerificationCode(PhoneVerificationNotification notification) {
        if (notification == null || notification.user() == null) {
            return;
        }
        LOGGER.info(
            "Verificacion de telefono solicitada para {}. Stub activo, sin envio real. Codigo preparado: [redacted]",
            maskPhone(notification.phoneNumber())
        );
    }

    private String maskPhone(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return "desconocido";
        }
        String trimmed = phoneNumber.trim();
        int visibleDigits = Math.min(2, trimmed.length());
        String suffix = trimmed.substring(trimmed.length() - visibleDigits);
        return "***" + suffix;
    }
}
