package com.plura.plurabackend.core.professional;

import java.util.List;

public record ProfessionalSearchIndexProfileView(
    Long professionalId,
    String slug,
    String displayName,
    String publicHeadline,
    String locationText,
    List<String> categorySlugs,
    Double rating,
    Double latitude,
    Double longitude,
    Boolean hasAvailabilityToday
) {}
