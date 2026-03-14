package com.plura.plurabackend.core.search;

import com.plura.plurabackend.core.search.dto.SearchSort;
import com.plura.plurabackend.core.search.dto.SearchType;
import java.time.LocalDate;

public record SearchQueryCriteria(
    SearchType type,
    String query,
    String categorySlug,
    Double lat,
    Double lng,
    double radiusKm,
    String city,
    LocalDate dateFrom,
    LocalDate dateTo,
    boolean availableNow,
    int page,
    int size,
    SearchSort sort
) {
    public int offset() {
        return page * size;
    }

    public boolean hasCoordinates() {
        return lat != null && lng != null;
    }
}
