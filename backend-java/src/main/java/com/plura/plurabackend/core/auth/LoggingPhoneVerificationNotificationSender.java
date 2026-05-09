package com.plura.plurabackend.core.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * LoggingPhoneVerificationNotificationSender es un componente de dominio del modulo autenticacion.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: notificaciones, telefono.
 */
@Component
public class LoggingPhoneVerificationNotificationSender implements PhoneVerificationNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingPhoneVerificationNotificationSender.class);

    /**
     * Envia verification code mediante el canal configurado.
     */
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

    /**
     * Ejecuta la logica de mask telefono manteniendola encapsulada en este componente.
     */
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
