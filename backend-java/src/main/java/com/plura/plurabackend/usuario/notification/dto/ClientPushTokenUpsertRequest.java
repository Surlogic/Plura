package com.plura.plurabackend.usuario.notification.dto;

public record ClientPushTokenUpsertRequest(
    String pushToken,
    String platform,
    Boolean enabled
) {}
