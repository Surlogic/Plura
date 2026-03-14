package com.plura.plurabackend.core.booking.bridge;

public record BookingClientProfessionalView(
    String serviceId,
    String professionalDisplayName,
    String professionalSlug,
    String professionalLocation
) {}
