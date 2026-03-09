package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.model.OtpChallengeChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
/**
 * Implementacion de {@link OtpChallengeNotificationSender} que registra
 * el desafio OTP en los logs en lugar de enviarlo por un canal real (email o SMS).
 *
 * <p>Se utiliza como stub durante el desarrollo o en entornos donde no se
 * dispone de servicios de envio configurados. El codigo OTP se redacta
 * en el log por seguridad.</p>
 */
public class LoggingOtpChallengeNotificationSender implements OtpChallengeNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingOtpChallengeNotificationSender.class);

    /**
     * Registra en el log la solicitud del desafio OTP sin realizar un envio real.
     *
     * <p>Si la notificacion o el usuario son nulos, el metodo retorna sin hacer nada.
     * El destino se enmascara parcialmente segun el canal (email o telefono).</p>
     *
     * @param notification datos del desafio OTP incluyendo usuario, proposito, canal, destino y codigo
     */
    @Override
    public void sendChallenge(OtpChallengeNotification notification) {
        // Validacion: se omite si faltan datos esenciales
        if (notification == null || notification.user() == null) {
            return;
        }
        LOGGER.info(
            "OTP challenge {} solicitado por {} hacia {}. Stub activo, sin envio real. Codigo preparado: [redacted]",
            notification.purpose(),
            notification.channel(),
            maskDestination(notification.channel(), notification.destination())
        );
    }

    /**
     * Enmascara el destino del desafio OTP segun el canal utilizado.
     *
     * <p>Para email: muestra solo el primer caracter del nombre local (ej. "u***@dominio.com").
     * Para telefono: muestra solo los ultimos 2 digitos (ej. "***45").</p>
     *
     * @param channel     el canal de envio (EMAIL o SMS)
     * @param destination el destino original (email o numero de telefono)
     * @return el destino enmascarado, o "desconocido" si es nulo o vacio
     */
    private String maskDestination(OtpChallengeChannel channel, String destination) {
        if (destination == null || destination.isBlank()) {
            return "desconocido";
        }
        // Enmascaramiento especifico para email: se preserva el primer caracter y el dominio
        if (channel == OtpChallengeChannel.EMAIL) {
            int atIndex = destination.indexOf('@');
            if (atIndex <= 1) {
                return "***" + destination.substring(Math.max(atIndex, 0));
            }
            return destination.substring(0, 1) + "***" + destination.substring(atIndex);
        }
        // Enmascaramiento para telefono: se muestran solo los ultimos 2 digitos
        int visibleDigits = Math.min(2, destination.length());
        return "***" + destination.substring(destination.length() - visibleDigits);
    }
}
