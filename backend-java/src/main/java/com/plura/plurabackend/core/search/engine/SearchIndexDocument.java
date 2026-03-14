package com.plura.plurabackend.core.search.engine;

import java.util.List;

public record SearchIndexDocument(
    Long id,
    String slug,
    String displayName,
    String headline,
    String locationText,
    List<String> categories,
    List<String> services,
    Double rating,
    Double lat,
    Double lng,
    Boolean hasAvailabilityToday
) {}
