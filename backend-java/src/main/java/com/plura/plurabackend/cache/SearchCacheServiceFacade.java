package com.plura.plurabackend.cache;

import com.plura.plurabackend.cache.redis.RedisJsonCacheAdapter;
import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class SearchCacheServiceFacade implements SearchCacheService {

    private static final Duration SEARCH_TTL = Duration.ofSeconds(30);
    private static final Duration SUGGEST_TTL = Duration.ofSeconds(60);

    private final InMemorySearchCacheService inMemory;
    private final RedisJsonCacheAdapter redis;
    private final MeterRegistry meterRegistry;
    private final boolean cacheEnabled;
    private final boolean searchCacheEnabled;
    private final boolean suggestCacheEnabled;

    public SearchCacheServiceFacade(
        InMemorySearchCacheService inMemory,
        RedisJsonCacheAdapter redis,
        MeterRegistry meterRegistry,
        @Value("${cache.enabled:false}") boolean cacheEnabled,
        @Value("${feature.cache.search-enabled:false}") boolean searchCacheEnabled,
        @Value("${feature.cache.suggest-enabled:false}") boolean suggestCacheEnabled
    ) {
        this.inMemory = inMemory;
        this.redis = redis;
        this.meterRegistry = meterRegistry;
        this.cacheEnabled = cacheEnabled;
        this.searchCacheEnabled = searchCacheEnabled;
        this.suggestCacheEnabled = suggestCacheEnabled;
    }

    @Override
    public Optional<SearchResponse> getSearch(String key) {
        if (!isSearchCacheActive()) {
            return Optional.empty();
        }
        Optional<SearchResponse> redisValue = redis.get(key, SearchResponse.class, "search");
        if (redisValue.isPresent()) {
            inMemory.putSearch(key, redisValue.get());
            markHit("search", "redis");
            return redisValue;
        }
        Optional<SearchResponse> memoryValue = inMemory.getSearch(key);
        if (memoryValue.isPresent()) {
            markHit("search", "memory");
            return memoryValue;
        }
        markMiss("search");
        return Optional.empty();
    }

    @Override
    public void putSearch(String key, SearchResponse response) {
        if (!isSearchCacheActive()) {
            return;
        }
        inMemory.putSearch(key, response);
        redis.put(key, response, SEARCH_TTL, "search");
    }

    @Override
    public Optional<SearchSuggestResponse> getSuggest(String key) {
        if (!isSuggestCacheActive()) {
            return Optional.empty();
        }
        Optional<SearchSuggestResponse> redisValue = redis.get(key, SearchSuggestResponse.class, "suggest");
        if (redisValue.isPresent()) {
            inMemory.putSuggest(key, redisValue.get());
            markHit("suggest", "redis");
            return redisValue;
        }
        Optional<SearchSuggestResponse> memoryValue = inMemory.getSuggest(key);
        if (memoryValue.isPresent()) {
            markHit("suggest", "memory");
            return memoryValue;
        }
        markMiss("suggest");
        return Optional.empty();
    }

    @Override
    public void putSuggest(String key, SearchSuggestResponse response) {
        if (!isSuggestCacheActive()) {
            return;
        }
        inMemory.putSuggest(key, response);
        redis.put(key, response, SUGGEST_TTL, "suggest");
    }

    @Override
    public void evictAll() {
        inMemory.evictAll();
        redis.evictByPrefix("search:", "search");
        redis.evictByPrefix("suggest:", "suggest");
    }

    private boolean isSearchCacheActive() {
        return cacheEnabled && searchCacheEnabled;
    }

    private boolean isSuggestCacheActive() {
        return cacheEnabled && suggestCacheEnabled;
    }

    private void markHit(String cacheName, String backend) {
        Counter.builder("plura.cache.hit")
            .description("Cache hits")
            .tag("cache", cacheName)
            .tag("backend", backend)
            .register(meterRegistry)
            .increment();
    }

    private void markMiss(String cacheName) {
        Counter.builder("plura.cache.miss")
            .description("Cache misses")
            .tag("cache", cacheName)
            .register(meterRegistry)
            .increment();
    }
}
