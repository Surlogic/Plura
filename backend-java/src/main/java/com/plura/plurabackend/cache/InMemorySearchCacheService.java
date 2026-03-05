package com.plura.plurabackend.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class InMemorySearchCacheService implements SearchCacheService {

    private static final Duration SEARCH_TTL = Duration.ofSeconds(30);
    private static final Duration SUGGEST_TTL = Duration.ofSeconds(60);

    private final Cache<String, SearchResponse> searchCache;
    private final Cache<String, SearchSuggestResponse> suggestCache;

    public InMemorySearchCacheService(
        @Value("${app.cache.search.max-size:20000}") long searchMaxSize,
        @Value("${app.cache.suggest.max-size:20000}") long suggestMaxSize
    ) {
        this.searchCache = Caffeine.newBuilder()
            .expireAfterWrite(SEARCH_TTL)
            .maximumSize(Math.max(1000L, searchMaxSize))
            .build();
        this.suggestCache = Caffeine.newBuilder()
            .expireAfterWrite(SUGGEST_TTL)
            .maximumSize(Math.max(1000L, suggestMaxSize))
            .build();
    }

    @Override
    public Optional<SearchResponse> getSearch(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(searchCache.getIfPresent(key));
    }

    @Override
    public void putSearch(String key, SearchResponse response) {
        if (key == null || key.isBlank() || response == null) {
            return;
        }
        searchCache.put(key, response);
    }

    @Override
    public Optional<SearchSuggestResponse> getSuggest(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(suggestCache.getIfPresent(key));
    }

    @Override
    public void putSuggest(String key, SearchSuggestResponse response) {
        if (key == null || key.isBlank() || response == null) {
            return;
        }
        suggestCache.put(key, response);
    }

    @Override
    public void evictAll() {
        searchCache.invalidateAll();
        suggestCache.invalidateAll();
    }
}
