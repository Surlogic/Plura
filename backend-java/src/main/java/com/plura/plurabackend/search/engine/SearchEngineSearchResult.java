package com.plura.plurabackend.search.engine;

import java.util.List;

public record SearchEngineSearchResult(List<Long> orderedIds, long total) {}
