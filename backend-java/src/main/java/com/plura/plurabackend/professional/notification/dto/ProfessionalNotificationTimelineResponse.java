package com.plura.plurabackend.professional.notification.dto;

import java.util.List;

public record ProfessionalNotificationTimelineResponse(
    Long bookingId,
    List<ProfessionalNotificationTimelineItemResponse> items
) {}
