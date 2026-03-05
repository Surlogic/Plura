package com.plura.plurabackend.cache;

import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.util.Optional;

public interface SearchCacheService {
    Optional<SearchResponse> getSearch(String key);

    void putSearch(String key, SearchResponse response);

    Optional<SearchSuggestResponse> getSuggest(String key);

    void putSuggest(String key, SearchSuggestResponse response);

    default void evictAll() {}
}
