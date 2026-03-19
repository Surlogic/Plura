package com.plura.plurabackend.core.notification.email.transport;

import com.plura.plurabackend.core.auth.TransactionalEmailService;
import com.plura.plurabackend.core.notification.email.NotificationEmailMessage;
import com.plura.plurabackend.core.notification.email.NotificationEmailSendResult;
import com.plura.plurabackend.core.notification.email.NotificationEmailSender;
import org.springframework.stereotype.Service;

@Service
public class SmtpNotificationEmailSender implements NotificationEmailSender {

    private final TransactionalEmailService transactionalEmailService;

    public SmtpNotificationEmailSender(TransactionalEmailService transactionalEmailService) {
        this.transactionalEmailService = transactionalEmailService;
    }

    @Override
    public NotificationEmailSendResult send(NotificationEmailMessage message) {
        if (message == null || isBlank(message.toAddress()) || isBlank(message.subject())) {
            return NotificationEmailSendResult.permanentFailure("invalid_message", "El email a enviar es inválido");
        }
        TransactionalEmailService.DeliveryStatus deliveryStatus = transactionalEmailService.send(
            new TransactionalEmailService.TransactionalEmailMessage(
                message.templateKey(),
                message.toAddress(),
                message.toName(),
                message.subject(),
                message.htmlBody(),
                message.textBody()
            )
        );
        return switch (deliveryStatus) {
            case SENT -> NotificationEmailSendResult.sent(null);
            case SKIPPED_FALLBACK -> NotificationEmailSendResult.permanentFailure(
                "smtp_delivery_disabled",
                "SMTP deshabilitado o incompleto para notification email"
            );
            case FAILED -> NotificationEmailSendResult.retryableFailure(
                "smtp_send_failed",
                "Fallo el envío SMTP de notification email"
            );
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }
}
