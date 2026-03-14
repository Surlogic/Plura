package com.plura.plurabackend.core.search.dto;

import java.util.Locale;

public enum SearchSort {
    RELEVANCE,
    DISTANCE,
    RATING;

    public static SearchSort fromRaw(String rawSort) {
        if (rawSort == null || rawSort.isBlank()) {
            return RELEVANCE;
        }
        return SearchSort.valueOf(rawSort.trim().toUpperCase(Locale.ROOT));
    }
}
