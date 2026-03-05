package com.plura.plurabackend.cache;

import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class InMemoryProfileCacheService implements ProfileCacheService {

    private static final Duration PAGE_TTL = Duration.ofMinutes(5);
    private static final Duration SUMMARIES_TTL = Duration.ofMinutes(2);

    private final ConcurrentHashMap<String, CacheEntry<ProfesionalPublicPageResponse>> pageCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry<List<ProfesionalPublicSummaryResponse>>> summaryCache =
        new ConcurrentHashMap<>();

    @Override
    public Optional<ProfesionalPublicPageResponse> getPublicPageBySlug(String slug) {
        return getValue(pageCache, slug);
    }

    @Override
    public void putPublicPageBySlug(String slug, ProfesionalPublicPageResponse response) {
        putValue(pageCache, slug, response, PAGE_TTL);
    }

    @Override
    public Optional<List<ProfesionalPublicSummaryResponse>> getPublicSummaries(String key) {
        return getValue(summaryCache, key);
    }

    @Override
    public void putPublicSummaries(String key, List<ProfesionalPublicSummaryResponse> response) {
        if (response == null) {
            return;
        }
        putValue(summaryCache, key, List.copyOf(response), SUMMARIES_TTL);
    }

    @Override
    public void evictPublicPageBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        pageCache.remove(slug);
    }

    @Override
    public void evictPublicSummaries() {
        summaryCache.clear();
    }

    private <T> Optional<T> getValue(ConcurrentHashMap<String, CacheEntry<T>> cache, String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
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
