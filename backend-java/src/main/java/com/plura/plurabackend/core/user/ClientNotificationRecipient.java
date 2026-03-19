package com.plura.plurabackend.core.user;

public record ClientNotificationRecipient(
    Long userId,
    String email,
    String displayName
) {}
