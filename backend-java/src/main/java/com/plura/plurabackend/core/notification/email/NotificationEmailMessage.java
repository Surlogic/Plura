package com.plura.plurabackend.core.notification.email;

public record NotificationEmailMessage(
    String templateKey,
    String toAddress,
    String toName,
    String subject,
    String htmlBody,
    String textBody
) {}
