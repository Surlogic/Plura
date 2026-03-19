package com.plura.plurabackend.core.notification.application;

import java.util.Map;

public record NotificationEmailProjectionCommand(
    String recipientEmail,
    String templateKey,
    String subject,
    Map<String, Object> payload
) {}
