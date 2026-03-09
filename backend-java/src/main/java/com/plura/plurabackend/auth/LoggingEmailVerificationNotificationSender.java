package com.plura.plurabackend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
/**
 * Implementacion de {@link EmailVerificationNotificationSender} que registra
 * la solicitud de verificacion de email en los logs en lugar de enviar un correo real.
 *
 * <p>Se utiliza como stub durante el desarrollo o en entornos donde no se
 * dispone de un servicio de correo configurado. El codigo de verificacion
 * se redacta en el log por seguridad.</p>
 */
public class LoggingEmailVerificationNotificationSender implements EmailVerificationNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingEmailVerificationNotificationSender.class);

    /**
     * Registra en el log la solicitud de verificacion de email sin realizar un envio real.
     *
     * <p>Si la notificacion o el usuario son nulos, el metodo retorna sin hacer nada.
     * El email se enmascara parcialmente para proteger la privacidad en los logs.</p>
     *
     * @param notification datos de la notificacion con usuario, email y codigo
     */
    @Override
    public void sendVerificationCode(EmailVerificationNotification notification) {
        // Validacion: se omite si faltan datos esenciales
        if (notification == null || notification.user() == null) {
            return;
        }
        LOGGER.info(
            "Verificacion de email solicitada para {}. Stub activo, sin envio real. Codigo preparado: [redacted]",
            maskEmail(notification.email())
        );
    }

    /**
     * Enmascara una direccion de email para proteger la privacidad en los logs.
     * Ejemplo: "usuario@dominio.com" se convierte en "u***@dominio.com".
     *
     * @param email la direccion de email a enmascarar
     * @return la direccion enmascarada, o "desconocido" si es nula o vacia
     */
    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "desconocido";
        }
        int atIndex = email.indexOf('@');
        // Si el caracter '@' esta al inicio o no existe, se enmascara completamente
        if (atIndex <= 1) {
            return "***" + email.substring(Math.max(atIndex, 0));
        }
        // Se muestra solo el primer caracter y se oculta el resto del nombre local
        return email.substring(0, 1) + "***" + email.substring(atIndex);
    }
}
