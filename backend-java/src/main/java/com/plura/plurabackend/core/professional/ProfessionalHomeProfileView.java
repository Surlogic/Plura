package com.plura.plurabackend.core.professional;

public record ProfessionalHomeProfileView(
    Long professionalId,
    String slug,
    String displayName,
    String primaryCategoryName,
    Double rating,
    String imageUrl
) {}
