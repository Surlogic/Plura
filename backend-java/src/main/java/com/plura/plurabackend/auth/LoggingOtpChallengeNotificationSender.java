package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.model.OtpChallengeChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
public class LoggingOtpChallengeNotificationSender implements OtpChallengeNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingOtpChallengeNotificationSender.class);

    @Override
    public void sendChallenge(OtpChallengeNotification notification) {
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

    private String maskDestination(OtpChallengeChannel channel, String destination) {
        if (destination == null || destination.isBlank()) {
            return "desconocido";
        }
        if (channel == OtpChallengeChannel.EMAIL) {
            int atIndex = destination.indexOf('@');
            if (atIndex <= 1) {
                return "***" + destination.substring(Math.max(atIndex, 0));
            }
            return destination.substring(0, 1) + "***" + destination.substring(atIndex);
        }
        int visibleDigits = Math.min(2, destination.length());
        return "***" + destination.substring(destination.length() - visibleDigits);
    }
}
