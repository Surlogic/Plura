package com.plura.plurabackend.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * PasswordResetEmailNotificationSender es un componente de dominio del modulo autenticacion.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Colabora con: transactionalEmailService, templateService, passwordResetTtlMinutes.
 * Foco funcional: notificaciones, contrasenas, email transaccional.
 */
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

    /**
     * Envia contrasena reset mediante el canal configurado.
     */
    @Override
    public void sendPasswordReset(PasswordResetNotification notification) {
        if (notification == null || notification.user() == null || notification.user().getEmail() == null) {
            return;
        }

        TransactionalEmailService.DeliveryStatus deliveryStatus = transactionalEmailService.send(
            templateService.buildPasswordResetEmail(
                notification.user().getEmail(),
                notification.user().getFullName(),
                notification.resetUrl(),
                passwordResetTtlMinutes
            )
        );

        if (deliveryStatus != TransactionalEmailService.DeliveryStatus.SENT) {
            throw new AuthApiException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "PASSWORD_RESET_EMAIL_UNAVAILABLE",
                "No pudimos enviar el email para restablecer la contraseña. Intentá de nuevo más tarde."
            );
        }
    }
}
