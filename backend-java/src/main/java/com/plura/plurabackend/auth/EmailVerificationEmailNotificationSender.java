package com.plura.plurabackend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EmailVerificationEmailNotificationSender implements EmailVerificationNotificationSender {

    private final TransactionalEmailService transactionalEmailService;
    private final PluraEmailTemplateService templateService;
    private final long ttlMinutes;

    public EmailVerificationEmailNotificationSender(
        TransactionalEmailService transactionalEmailService,
        PluraEmailTemplateService templateService,
        @Value("${app.auth.email-verification.ttl-minutes:15}") long ttlMinutes
    ) {
        this.transactionalEmailService = transactionalEmailService;
        this.templateService = templateService;
        this.ttlMinutes = ttlMinutes;
    }

    @Override
    public void sendVerificationCode(EmailVerificationNotification notification) {
        if (notification == null || notification.user() == null || notification.email() == null) {
            return;
        }
        TransactionalEmailService.DeliveryStatus deliveryStatus = transactionalEmailService.send(
            templateService.buildEmailVerificationEmail(
                notification.email(),
                notification.user().getFullName(),
                notification.code(),
                ttlMinutes
            )
        );
        if (deliveryStatus != TransactionalEmailService.DeliveryStatus.SENT) {
            throw new AuthApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "EMAIL_DELIVERY_UNAVAILABLE",
                "No pudimos enviar el código de verificación por email. Intentá de nuevo más tarde."
            );
        }
    }
}
