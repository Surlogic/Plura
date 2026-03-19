package com.plura.plurabackend.professional.notification.dto;

import java.util.List;

public record ProfessionalNotificationListResponse(
    int page,
    int size,
    long total,
    List<ProfessionalNotificationItemResponse> items
) {}
