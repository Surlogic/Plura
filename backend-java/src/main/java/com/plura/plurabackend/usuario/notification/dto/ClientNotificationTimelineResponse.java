package com.plura.plurabackend.usuario.notification.dto;

import java.util.List;

public record ClientNotificationTimelineResponse(
    Long bookingId,
    List<ClientNotificationTimelineItemResponse> items
) {}
