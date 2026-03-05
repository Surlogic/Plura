package com.plura.plurabackend.cache;

import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class InMemorySearchCacheService implements SearchCacheService {

    private static final Duration SEARCH_TTL = Duration.ofSeconds(30);
    private static final Duration SUGGEST_TTL = Duration.ofSeconds(60);

    private final ConcurrentHashMap<String, CacheEntry<SearchResponse>> searchCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<SearchSuggestResponse>> suggestCache = new ConcurrentHashMap<>();

    @Override
    public Optional<SearchResponse> getSearch(String key) {
        return getValue(searchCache, key);
    }

    @Override
    public void putSearch(String key, SearchResponse response) {
        putValue(searchCache, key, response, SEARCH_TTL);
    }

    @Override
    public Optional<SearchSuggestResponse> getSuggest(String key) {
        return getValue(suggestCache, key);
    }

    @Override
    public void putSuggest(String key, SearchSuggestResponse response) {
        putValue(suggestCache, key, response, SUGGEST_TTL);
    }

    @Override
    public void evictAll() {
        searchCache.clear();
        suggestCache.clear();
    }

    private <T> Optional<T> getValue(ConcurrentHashMap<String, CacheEntry<T>> cache, String key) {
        CacheEntry<T> entry = cache.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.expiresAtEpochMillis < System.currentTimeMillis()) {
            cache.remove(key, entry);
            return Optional.empty();
        }
        return Optional.ofNullable(entry.value);
    }

    private <T> void putValue(
        ConcurrentHashMap<String, CacheEntry<T>> cache,
        String key,
        T value,
        Duration ttl
    ) {
        if (key == null || key.isBlank() || value == null) {
            return;
        }
        cache.put(key, new CacheEntry<>(value, System.currentTimeMillis() + ttl.toMillis()));
    }

    private record CacheEntry<T>(T value, long expiresAtEpochMillis) {}
}
