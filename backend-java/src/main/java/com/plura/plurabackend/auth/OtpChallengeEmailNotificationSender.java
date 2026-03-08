package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.model.OtpChallengeChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OtpChallengeEmailNotificationSender implements OtpChallengeNotificationSender {

    private static final Logger LOGGER = LoggerFactory.getLogger(OtpChallengeEmailNotificationSender.class);

    private final TransactionalEmailService transactionalEmailService;
    private final PluraEmailTemplateService templateService;
    private final long ttlMinutes;

    public OtpChallengeEmailNotificationSender(
        TransactionalEmailService transactionalEmailService,
        PluraEmailTemplateService templateService,
        @Value("${app.auth.otp-challenge.ttl-minutes:10}") long ttlMinutes
    ) {
        this.transactionalEmailService = transactionalEmailService;
        this.templateService = templateService;
        this.ttlMinutes = ttlMinutes;
    }

    @Override
    public void sendChallenge(OtpChallengeNotification notification) {
        if (notification == null || notification.user() == null || notification.destination() == null) {
            return;
        }
        if (notification.channel() != OtpChallengeChannel.EMAIL) {
            LOGGER.info(
                "OTP challenge {} hacia {} omitido en email delivery. SMS sigue fuera de alcance y usa fallback operativo.",
                notification.purpose(),
                maskDestination(notification.destination())
            );
            return;
        }
        transactionalEmailService.send(
            templateService.buildOtpChallengeEmail(
                notification.destination(),
                notification.user().getFullName(),
                notification.purpose(),
                notification.code(),
                ttlMinutes
            )
        );
    }

    private String maskDestination(String destination) {
        if (destination == null || destination.isBlank()) {
            return "desconocido";
        }
        int atIndex = destination.indexOf('@');
        if (atIndex <= 1) {
            return "***" + destination.substring(Math.max(atIndex, 0));
        }
        return destination.substring(0, 1) + "***" + destination.substring(atIndex);
    }
}
