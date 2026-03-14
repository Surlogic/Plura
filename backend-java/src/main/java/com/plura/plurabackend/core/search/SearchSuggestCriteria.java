package com.plura.plurabackend.core.search;

public record SearchSuggestCriteria(
    String query,
    Double lat,
    Double lng,
    String city,
    double radiusKm,
    int limit
) {
    public boolean hasCoordinates() {
        return lat != null && lng != null;
    }

    public boolean hasLocationFilter() {
        return hasCoordinates() || (city != null && !city.isBlank());
    }
}
