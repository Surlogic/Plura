package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetEmailNotificationSender implements PasswordResetNotificationSender {

    private final TransactionalEmailService transactionalEmailService;
    private final PluraEmailTemplateService templateService;
    private final long passwordResetTtlMinutes;

    public PasswordResetEmailNotificationSender(
        TransactionalEmailService transactionalEmailService,
        PluraEmailTemplateService templateService,
        @Value("${app.auth.password-reset.ttl-minutes:30}") long passwordResetTtlMinutes
    ) {
        this.transactionalEmailService = transactionalEmailService;
        this.templateService = templateService;
        this.passwordResetTtlMinutes = passwordResetTtlMinutes;
    }

    @Override
    public void sendPasswordReset(PasswordResetNotification notification) {
        if (notification == null || notification.user() == null || notification.user().getEmail() == null) {
            return;
        }
        transactionalEmailService.send(
            templateService.buildPasswordResetEmail(
                notification.user().getEmail(),
                notification.user().getFullName(),
                notification.resetUrl(),
                passwordResetTtlMinutes
            )
        );
    }
}
