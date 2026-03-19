package com.plura.plurabackend.core.professional;

public record ProfessionalNotificationRecipient(
    Long professionalId,
    String email,
    String displayName
) {}
