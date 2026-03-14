package com.plura.plurabackend.core.professional;

public record ProfessionalAvailabilityProfileView(
    Long professionalId,
    boolean active,
    String scheduleJson,
    Integer slotDurationMinutes
) {}
