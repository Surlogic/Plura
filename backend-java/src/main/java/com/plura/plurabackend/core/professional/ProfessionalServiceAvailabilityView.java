package com.plura.plurabackend.core.professional;

public record ProfessionalServiceAvailabilityView(
    Long professionalId,
    String serviceId,
    String duration,
    Integer postBufferMinutes
) {}
