package com.plura.plurabackend.core.cache;

import com.plura.plurabackend.core.search.dto.SearchResponse;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.util.Optional;

public interface SearchCacheService {
    Optional<SearchResponse> getSearch(String key);

    void putSearch(String key, SearchResponse response);

    Optional<SearchSuggestResponse> getSuggest(String key);

    void putSuggest(String key, SearchSuggestResponse response);

    default void evictAll() {}
}
