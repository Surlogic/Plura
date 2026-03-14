package com.plura.plurabackend.core.auth;

public interface TransactionalEmailService {

    DeliveryStatus send(TransactionalEmailMessage message);

    enum DeliveryStatus {
        SENT,
        SKIPPED_FALLBACK,
        FAILED
    }

    record TransactionalEmailMessage(
        String templateKey,
        String toAddress,
        String toName,
        String subject,
        String htmlBody,
        String textBody
    ) {}
}
