package com.plura.plurabackend.usuario.notification.dto;

import java.util.List;

public record ClientNotificationListResponse(
    int page,
    int size,
    long total,
    List<ClientNotificationItemResponse> items
) {}
